import { bedrockServer } from 'bdsx/launcher';
import { ScriptEventRequest } from './ScriptEventRequest';
import { CommandResultType } from 'bdsx/commandresult';
import { events } from 'bdsx/event';
import { command } from 'bdsx/command';
import { CommandPermissionLevel } from 'bdsx/bds/command';
import { CxxString } from 'bdsx/nativetype';
import { ScriptEventResponse } from './ScriptEventResponse';

const SCRIPT_EVENT_ID = 'connector:request';
const DEFAULT_REQUEST_TIMEOUT = 30_000;

export class RequestTimeoutError extends Error {
  constructor(
    message: string,
    public request: ScriptEventRequest
  ) {
    super(message);
  }
}

export interface RequestPayload {
  header: {
    requestId: string;
  };
  data: any
}

export class RequestHandler {
  private pendingRequests = new Map<string, (payload: RequestPayload) => void>();
  private pendingTimeouts = new Set<NodeJS.Timeout>();
  constructor() {
    events.serverOpen.on(() => this.registerCommand());
    events.serverClose.on(() => this.pendingTimeouts.forEach(to => clearTimeout(to)));
  }

  public send(request: ScriptEventRequest): Promise<ScriptEventResponse> {
    const payload: RequestPayload = {
      header: {
        requestId: request.id
      },
      data: request.data
    }
    return new Promise((res, rej) => {
      bedrockServer.executeCommand(`scriptevent ${SCRIPT_EVENT_ID} ${JSON.stringify(payload)}`, CommandResultType.Mute);

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

  private onResponse(rawResponse: string) {
    let payload: RequestPayload | undefined = undefined;
    try {
      payload = JSON.parse(rawResponse);
    } catch {}
    if (!payload) return console.error(`[script-connector] Failed to parse response.\ndata:`, rawResponse);
    const callback = this.pendingRequests.get(payload.header.requestId);
    if (!callback) return console.error(`[script-connector] Unknown response.\ndata:`, rawResponse);
    callback(payload);
  }

  private registerCommand() {
    command.register('request', 'for bdsx-connector', CommandPermissionLevel.Operator)
      .overload((params) => {
        this.onResponse(params.response);
      }, {
        action: command.enum('action.response', 'response'),
        response: CxxString
      })
  }
}