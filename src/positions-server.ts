import {createServer, Server} from 'http';
import * as express from 'express';
import * as socketIo from 'socket.io';
import {Socket} from 'socket.io';

import config from './config';

import {createLogger, ILogger} from './logger';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';


import {Collection, MongoClient} from 'mongodb';
import cors = require('cors');
import _ = require('lodash');
import uuid = require('uuid');
import {TPositionsCollection} from 'FPKFOOD-models/dist';


type TOrdersCollection = any;


const MongoDB = require('mongodb');

const getMongoDbCollection = async (collectioName = 'meetings') => {
  let error='';
  const client:MongoClient = await MongoDB.MongoClient.connect(config.mongodb.url, {useNewUrlParser:true , useUnifiedTopology: true})
    .catch((err:any) => {
      error = err;
    });

  if (!client) {
    throw new Error("Can't connect to Mongo db by url" + config.mongodb.url + ' with error: ' + error)
  }

    const db = client.db(config.mongodb.dbName);
    console.log('connect to mongo db');
    return db.collection(collectioName);

};

let PositionsCollection:Collection<TPositionsCollection>;
try {

  (  async ()=> PositionsCollection = await getMongoDbCollection('positions'))();
} catch (e) {
  console.log(" Can't run mongo:",e);
  throw (e);
}


interface IMessages {
  id:string,
  sessionId:string;
  data:any
}



class Handler {

  private logger:ILogger;
  private sessionId:string;

  constructor(
    private socket:SocketIO.Socket,
    private collection:Collection<TPositionsCollection>,
    ) {

    this.logger = createLogger(this.getLoggerContext.bind(this) );
    this.sessionId = uuid.v4();
  }



  getLoggerContext = () =>{
    let context = '<'+this.sessionId + '>';
    return context;
  };




  async onMessageLogic(m:IMessages) {

    this.logger.log('onMessageLogic', m);

    switch (m.id) {
      case "Handshake":{

        this.sessionId = m.sessionId;

          this.sendMessage(m);

      }break;
      case "new-data":{



          const kpath = `dish.`;

          await this.collection.insertOne(m.data);

        } break




    }
  };



/*  private async initMongoRecord() {
    try {
      const doc:any = {
        _id:this.meetingId
      };
      const rec= await this.orderCollections.findOne(doc);
      if(!!!rec) {
        this.logger.info('create new Record');
        await this.orderCollections.insertOne(doc);
      }
    } catch (e) {
      this.logger.warn('initMongoRecord', e);
    }
  }*/





  async onDisconnectLogic(){
   //TODO disconect logic
      this.logger.warn('onDisconnectLogic:Implement me');

  }



 /* private sendSuccess(message:string, details?:string) {

    const request = SerializeService.makeRequest(ThriftService.Success, {message,details});
    this.sendMessage(request.serialized);
  }

  private sendError(errorData:ThriftService.IError) {
    if(!config.sendErrorDetails){
      errorData.details = undefined;
    }
    const request = SerializeService.makeRequest(ThriftService.Error, errorData);
    this.sendErrorMessage(request.serialized);
  }
  private sendErrorMessage(serializedMessageData:any) {
    (this.socket as any).binary(true).emit(this.getErrorMessageId(), serializedMessageData);
  }

  private getErrorMessageId(){
    return 'error:' + this.getRoomId() ;
  }
*/

  private sendMessage(serializedMessageData:any) {
    this.logger.log('send', serializedMessageData);

    (this.socket as any).emit(this.getMessageId(), serializedMessageData);
  }

  private getRoomId() {
    return this.sessionId;
  }

  private getMessageId() {
    return 'message:' + this.getRoomId();
  }

  private getUserIdMessageId(userId:string){
    return this.getMessageId() + ':' + userId;
  }

}

export class PositionsServer {
  public static readonly PORT:number = 6760;
  private app:express.Application;
  private server:Server;
  private io:SocketIO.Server;
  private port:string | number;
  private logger:ILogger;
  constructor() {
    //use  Cross-Origin Resource Sharing (CORS)
    // https://developer.mozilla.org/ru/docs/Web/HTTP/CORS
    //TODO make CORS more sophisticated https://brianflove.com/2017/03/22/express-cors-typescript/
    this.initExpressServer(!!process.env.useCORS);

    this.initSocketIO(process.env.PORT || PositionsServer.PORT);
    this.listen();
    this.logger = createLogger('PositionsServer');
  }


  private initExpressServer(useCors:boolean):void {
    this.app = express();
    this.app.use(cors());
    this.app.options('*', cors());


   if(config.ssl) {
     console.log(__dirname);

     const keyPath = path.join(__dirname,'./keys/key.pem');
     console.log(keyPath);
     var options = {
       key:fs.readFileSync(keyPath),
       cert:fs.readFileSync(path.join(__dirname,'/keys/cert.crt'))
     };

     this.server = https.createServer(options, this.app);
   } else {
     this.server = createServer(this.app);
   }
  }

  private initSocketIO(port:string | number):void {
    this.port = port;
    this.io = socketIo(this.server);
  }

  private listen():void {
    this.server.listen(this.port, () => {
      this.logger.log('Running server on port %s', this.port);
    });

    this.io.on('connect', (socket:Socket) => {
      this.logger.log('Connected client on port %s.', this.port);

      const handler = new Handler(socket, PositionsCollection);

      socket.on('message', (m:any) => {
        console.log('message', m);
        handler.onMessageLogic(m);
      });


      socket.on('disconnect', () => {
        handler.onDisconnectLogic();
        this.logger.log('Client disconnected');
      });
    });
  }

  public getApp():express.Application {
    return this.app;
  }
}
