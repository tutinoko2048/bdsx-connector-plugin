import type { RequestPayload } from './RequestHandler';
import type { ScriptEventRequest } from './ScriptEventRequest';

export class ScriptEventResponse {
  public request: ScriptEventRequest;
  public data: any;
  constructor(payload: RequestPayload, request: ScriptEventRequest) {
    this.request = request;
    this.data = payload.data;
  }
}