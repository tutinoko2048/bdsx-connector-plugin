import * as EventEmitter from 'events';
import { bedrockServer } from 'bdsx/launcher';
import { ScriptEventRequest } from './ScriptEventRequest';
import { CommandResultType } from 'bdsx/commandresult';
import { events } from 'bdsx/event';
import { command } from 'bdsx/command';
import { CommandPermissionLevel } from 'bdsx/bds/command';
import { CxxString } from 'bdsx/nativetype';
import { ScriptEventResponse } from './ScriptEventResponse';

const SCRIPT_EVENT_REQUEST = 'connector:request';
const DEFAULT_REQUEST_TIMEOUT = 30_000;

export class RequestTimeoutError extends Error {
  constructor(
    message: string,
    public request: ScriptEventRequest
  ) {
    super(message);
  }
}

export enum RequestType {
  Request,
  Response
}

export interface RequestPayload {
  header: {
    requestId: string;
    type: RequestType
  };
  data: any;
}

export class RequestHandler extends EventEmitter {
  private pendingRequests = new Map<string, (payload: RequestPayload) => void>();
  private pendingTimeouts = new Set<NodeJS.Timeout>();
  constructor() {
    super();
    events.serverOpen.on(() => this.registerCommand());
    events.serverClose.on(() => this.pendingTimeouts.forEach(to => clearTimeout(to)));
  }

  public send(request: ScriptEventRequest): Promise<ScriptEventResponse> {
    const payload: RequestPayload = {
      header: {
        requestId: request.id,
        type: RequestType.Request
      },
      data: request.data
    }
    this.emit('send', payload);

    return new Promise((res, rej) => {
      bedrockServer.executeCommand(`scriptevent ${SCRIPT_EVENT_REQUEST} ${JSON.stringify(payload)}`, CommandResultType.Mute);
      
      const timeout = setTimeout(() => {
        rej(new RequestTimeoutError('Request timeout.', request));
        this.pendingRequests.delete(request.id);
        this.pendingTimeouts.delete(timeout);
      }, DEFAULT_REQUEST_TIMEOUT);
      this.pendingTimeouts.add(timeout);

      this.pendingRequests.set(request.id, (payload) => {
        const response = new ScriptEventResponse(payload, request);
        res(response);
        this.pendingRequests.delete(request.id);
        this.pendingTimeouts.delete(timeout);
      });
    });
  }

  private onRequest(rawRequest: string) {
    let payload: RequestPayload | undefined;
    try {
      payload = JSON.parse(rawRequest);
    } catch {}
    if (!payload) return console.error(`[script-connector] Failed to parse request.\ndata:`, rawRequest);

    if (payload.header.type === RequestType.Request) {
      this.emit('receive', payload);

    } else if (payload.header.type === RequestType.Response) {
      const callback = this.pendingRequests.get(payload.header.requestId);
      if (!callback) return console.error(`[script-connector] Unknown response.\ndata:`, rawRequest);
      callback(payload);
    } else {
      console.error('[script-connector] unknown request type', payload.header.type);
    }
  }

  private registerCommand() {
    command.register('request', 'for bdsx-connector', CommandPermissionLevel.Operator)
      .overload((params) => {
        this.onRequest(params.body);
      }, {
        action: command.enum('action.request', 'send'),
        body: CxxString
      });
  }
}

export interface EventTypeMap {
  send: [RequestPayload];
  receive: [RequestPayload];
}

export interface RequestHandler {
  emit<K extends keyof EventTypeMap>(eventName: K, ...args: EventTypeMap[K]): boolean;
  on<K extends keyof EventTypeMap>(eventName: K, callback: (...args: EventTypeMap[K]) => void): this;
  once<K extends keyof EventTypeMap>(eventName: K, callback: (...args: EventTypeMap[K]) => void): this;
  off<K extends keyof EventTypeMap>(eventName: K, callback: (...args: EventTypeMap[K]) => void): this;
}