import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import { Project } from 'src/project/entities/project.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.prismaService.user.create({
      data: {
        ...createUserDto,
        password: await hash(createUserDto.password, 10),
      },
    });

    const invites = await this.prismaService.invite.findMany({
      where: {
        email: createUserDto.email,
      },
    });

    if (invites.length > 0) {
      await this.prismaService.$transaction([
        this.prismaService.projectUser.createMany({
          data: invites.map(({ projectId }) => ({
            projectId,
            userId: user.id,
          })),
        }),
        this.prismaService.invite.deleteMany({
          where: {
            email: createUserDto.email,
          },
        }),
      ]);
    }

    await Promise.allSettled([
      this.mailerService.sendMail({
        subject: 'Email confirmation',
        to: user.email,
        template: 'confirmation',
        context: {
          name: user.name,
          url: `${this.configService.get<string>(
            'FRONTEND_URL',
          )}/confirm?code=${await this.jwtService.signAsync({
            id: user.id,
          })}`,
        },
      }),
    ]);

    return user;
  }

  findAll(): Promise<User[]> {
    return this.prismaService.user.findMany({
      where: {},
    });
  }

  findOne(id: number): Promise<User> {
    return this.prismaService.user.findUniqueOrThrow({
      where: {
        id,
      },
    });
  }

  async update(updateUserDto: UpdateUserDto): Promise<User> {
    return this.prismaService.user.update({
      where: {
        id: updateUserDto.id,
      },
      data: {
        ...updateUserDto,
        password: updateUserDto.password
          ? await hash(updateUserDto.password, 10)
          : undefined,
      },
    });
  }

  remove(id: number): Promise<User> {
    return this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }

  async confirm(code: string): Promise<boolean> {
    const user = await this.jwtService.verifyAsync(code);
    await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        confirmed: true,
      },
    });

    return true;
  }

  findAllProjects(id: number): Promise<Project[]> {
    return this.prismaService.project.findMany({
      where: {
        users: {
          some: {
            userId: id,
          },
        },
      },
      include: {
        users: {
          where: {
            userId: id,
          },
        },
      },
    });
  }
}
