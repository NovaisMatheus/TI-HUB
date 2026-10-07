import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './common/prisma.service';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { ResourceController } from './resources/resource.controller';
import { ResourceService } from './resources/resource.service';
import { WorkflowService } from './acquisitions/workflow.service';
import { SearchService } from './search/search.service';
import { RecordHooks } from './resources/record-hooks';
import { ConnectionService } from './equipment/connection.service';
@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } }),
  ],
  controllers: [AuthController, ResourceController],
  providers: [
    PrismaService,
    AuthService,
    ResourceService,
    RecordHooks,
    WorkflowService,
    SearchService,
    ConnectionService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
