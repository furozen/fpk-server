import {Subject} from 'rxjs';

export type ILogCall = (...args:any[]) => void;
export interface ILogger {

  error:ILogCall;
  info:ILogCall;
  log:ILogCall;
  warn:ILogCall;
  debug:ILogCall;

}

const logging:Subject<string> = new Subject();

export const logging$ = logging.asObservable();

export const createLogger = (context:any, postfix?:Function):ILogger => {
  const op = (method:string, showingNameOfMethod:string=undefined) =>
    (...args:any[]) => {
      const [originalMessage, ...tail] = args;
      const timestamp = new Date().toISOString().replace('T',' ').replace('Z','');
      let currentContext = context;
      if( typeof context === 'function') {
        currentContext = context();
      }
      showingNameOfMethod = showingNameOfMethod?showingNameOfMethod.toUpperCase():method.toUpperCase();
      const formattedMessage = `${timestamp} /${showingNameOfMethod}/[${currentContext}] ${originalMessage}`;
      let postfixStr ='';
      if(postfix) {
         postfixStr = postfix(method);
      }
      (console as any)[method](...[formattedMessage,  ...tail, postfixStr ]);
      logging.next(timestamp.concat(...[' ',`${method} [${currentContext}] ${originalMessage}`,...tail, postfixStr]));
    };

  const loggerInstance = {
    error:op('error'),
    info:op('info'),
    log:op('log'),
    warn:op('warn', 'warn'),
    debug:op('log', 'debug')
  };

  return loggerInstance;
};
