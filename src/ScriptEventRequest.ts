import { getRandomText } from './util';

export class ScriptEventRequest {
  public readonly id: string;
  constructor(public data: any) {
    this.id = getRandomText(16);
  }
}
