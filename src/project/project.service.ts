import { Injectable } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from 'src/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(userId: number, createProjectDto: CreateProjectDto) {
    return this.prismaService.project.create({
      data: {
        ...createProjectDto,
        slug: slugify(createProjectDto.name, {
          remove: /[^a-z0-9 ]/i,
          lower: true,
        }),
        roles: {
          create: {
            userId,
            role: RoleType.Owner,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billing: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prismaService.project.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billing: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                email: true,
              },
            },
            role: true,
          },
        },
      },
    });
  }

  async inviteUser(projectId: number, inviteUserDto: InviteUserDto) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: inviteUserDto.email,
      },
    });

    if (user) {
      await this.prismaService.userRole.create({
        data: {
          projectId,
          userId: user.id,
        },
      });

      return;
    }

    await this.prismaService.invite.create({
      data: {
        projectId,
        email: inviteUserDto.email,
      },
    });
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    return this.prismaService.project.update({
      where: {
        id,
      },
      data: updateProjectDto,
      select: {
        id: true,
        name: true,
        slug: true,
        billing: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: number) {
    return this.prismaService.project.delete({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billing: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}