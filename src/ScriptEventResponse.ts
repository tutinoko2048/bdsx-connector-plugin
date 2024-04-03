import type { ResponsePayload } from './RequestHandler';
import type { ScriptEventRequest } from './ScriptEventRequest';

export class ScriptEventResponse {
  public readonly request: ScriptEventRequest;
  public readonly data: any;
  public readonly status: number;
  constructor(payload: ResponsePayload, request: ScriptEventRequest) {
    this.request = request;
    this.data = payload.data;
    this.status = payload.status;
  }
}
