import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import Joi from 'joi';
import * as path from 'path';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        PORT: Joi.number().default(8080),
        SECRET: Joi.string().required(),
        MAILER_TRANSPORT: Joi.string().required(),
        MAILER_SECRET: Joi.string().required(),
        FRONTEND_URL: Joi.string().uri().required(),
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const transport = configService.get<string>('MAILER_TRANSPORT');
        return {
          transport,
          defaults: {
            from: `lb-nest <${new URL(transport).username}>`,
          },
          template: {
            adapter: new HandlebarsAdapter(),
            dir: path.join(__dirname, '@email'),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    UserModule,
    ProjectModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
