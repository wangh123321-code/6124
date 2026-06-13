import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './modules/auth/auth.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { LockerModule } from './modules/locker/locker.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { LogModule } from './modules/log/log.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'swim',
      password: process.env.DB_PASSWORD || 'swim123456',
      database: process.env.DB_NAME || 'swim_management',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'swim-management-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    TicketModule,
    LockerModule,
    ApprovalModule,
    StatisticsModule,
    LogModule,
    TasksModule,
    SeedModule,
  ],
})
export class AppModule {}
