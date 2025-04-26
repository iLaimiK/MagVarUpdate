// src/index.ts
import {handleResponseMessage} from './function';
import { initCheck } from './variable_init'
import './state_update'

eventOn(tavern_events.GENERATION_ENDED, handleResponseMessage);
eventOn(tavern_events.MESSAGE_SENT, initCheck);
eventOn(tavern_events.GENERATION_STARTED, initCheck);

