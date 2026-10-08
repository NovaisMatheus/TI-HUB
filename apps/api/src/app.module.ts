import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './common/prisma.service';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './auth/users.controller';
import { ResourceController } from './resources/resource.controller';
import { ResourceService } from './resources/resource.service';
import { WorkflowService } from './acquisitions/workflow.service';
import { SearchService } from './search/search.service';
import { RecordHooks } from './resources/record-hooks';
import { ConnectionService } from './equipment/connection.service';
import { DemandController } from './demands/demand.controller';
import { ChatController } from './chat/chat.controller';
import { GoogleChatService } from './chat/google-chat.service';
import { AcquisitionController } from './acquisitions/acquisition.controller';
import { DocumentController } from './documents/document.controller';
import { DocumentService } from './documents/document.service';
@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '8h' } }),
  ],
  controllers: [
    AuthController,
    UsersController,
    ResourceController,
    DemandController,
    ChatController,
    AcquisitionController,
    DocumentController,
  ],
  providers: [
    PrismaService,
    AuthService,
    ResourceService,
    RecordHooks,
    WorkflowService,
    SearchService,
    ConnectionService,
    GoogleChatService,
    DocumentService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
