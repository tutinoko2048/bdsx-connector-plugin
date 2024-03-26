import * as http from 'http';
import { RequestHandler } from './RequestHandler';

export const handler = new RequestHandler();

export * from './ScriptEventRequest';
export * from './ScriptEventResponse';
export * from './RequestHandler';

/*
const httpServer = http.createServer((req, res) => {
  console.log(req)
  res.end();
});
httpServer.listen(8000);

events.serverClose.on(() => void httpServer.close());
*/