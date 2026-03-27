import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';

export const GetAgent = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const ua = new UAParser(request.headers['user-agent']).getResult();

  return ua.os.name + " " + ua.browser.name;
});