import { getRandomText } from './util';

export class ScriptEventRequest {
  public id: string;
  constructor(public data: any) {
    this.id = getRandomText(16);
  }
}