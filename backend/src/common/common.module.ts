import { Module, Global } from '@nestjs/common';
import { LogService } from './services/log.service';
import { MemberService } from './services/member.service';

@Global()
@Module({
  providers: [LogService, MemberService],
  exports: [LogService, MemberService],
})
export class CommonModule {}
