import { IncomingMessage } from 'http';
import internal from 'stream';
import ws from 'ws';
import { Subscription } from '../types';
import { ContextService } from './context';

interface Notification {
    type: 'warning' | 'error' | 'info' | 'update';
    message: string;
    id: string;
    subscriptionId: string;
    publisherId: string;
}

export interface NotificationService {
    sendError: (message: string, subscription?: Subscription) => void;
    sendMessage: (message: string, subscription?: Subscription) => void;
    sendWarning: (message: string, subscription?: Subscription) => void;
    sendUpdate: (subscription: Subscription) => void;
    upgradeConnection: (socket: internal.Duplex, req: IncomingMessage, head: Buffer) => void;
}

export const createNotificationService: (contextService: ContextService) => NotificationService = (contextService) => {

    let sockets: ws.WebSocket[] = [];

    const wsServer = new ws.Server({noServer: true});

    const sendNotification = (data: Notification) : void => {
        for (const socket of sockets) {
            socket.send(JSON.stringify(data));
        }
    }

    return {
        sendError: (message, subscription?) => {
            sendNotification({
                type: 'error',
                message,
                id: contextService.getRequestId(),
                subscriptionId: subscription?.id ?? "none",
                publisherId: subscription?.publisherId ?? "none"
            });
        },

        sendMessage: (message, subscription?) => {
            sendNotification({
                type: 'info',
                message,
                id: contextService.getRequestId(),
                subscriptionId: subscription?.id ?? "none",
                publisherId: subscription?.publisherId ?? "none"
            });
        },

        sendWarning: (message, subscription?) => {
            sendNotification({
                type: 'warning',
                message,
                id: contextService.getRequestId(),
                subscriptionId: subscription?.id ?? "none",
                publisherId: subscription?.publisherId ?? "none"
            });
        },

        sendUpdate: (subscription) => {
            sendNotification({
                type: 'update',
                message: "",
                id: contextService.getRequestId(),
                subscriptionId: subscription.id,
                publisherId: subscription.publisherId
            });
        },

        upgradeConnection: (socket, req, head) => {
            wsServer.handleUpgrade(req, socket, head, socket => {
                sockets.push(socket);
                console.log("Opened socket");
                socket.addEventListener('close', e => {
                    sockets = sockets.filter(x => x !== socket);
                    console.log("Closed socket");
                });
            });
        }
    };
  };