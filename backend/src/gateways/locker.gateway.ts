import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Locker } from '../entities/locker.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/locker',
})
export class LockerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  broadcastLockerUpdate(locker: Locker) {
    this.server.emit('lockerUpdated', locker);
  }

  broadcastStatisticsUpdate(stats: any) {
    this.server.emit('statisticsUpdated', stats);
  }

  broadcastWarning(warning: any) {
    this.server.emit('lockerWarning', warning);
  }

  @SubscribeMessage('joinLockerRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    return { status: 'success', room };
  }
}
