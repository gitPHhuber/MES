import { makeAutoObservable } from "mobx";

export default class FirmwareFCStore {
  _counterTotalForSession: number = 0;
  _countPort: number = 5
  _serialIdsFC: { [key: number]: string } = {};
  _flashStatus: string[] = Array(this._countPort).fill("Не прошито");
  _loading: boolean[] = Array(this._countPort).fill(false);
  _messageDB: string[] = Array(this._countPort).fill("Не добавлено")
  private _proMode: boolean = false


  constructor() {
    makeAutoObservable(this);
  }

  setSerialIdsFC(port: number, serialId: string) {
    this._serialIdsFC[port] = serialId;
  }

  resetSerialIds() {
    this._serialIdsFC = {};
  }

  setFlashStatus(port: number, status: string) {
    this._flashStatus[port] = status;
  }

  setLoading(port: number, isLoading: boolean) {
    this._loading[port] = isLoading;
  }
  setMessageDB(port: number, messageDB: string) {
    this._messageDB[port] = messageDB
  }


  setCountPort(count: number) {
    this._countPort = count;
  }
  setCountPortPlus() {
    this._countPort += 1;
  }
  setCountPortMinus() {
    this._countPort -= 1;
  }

  setCounterTotalForSessionPlus() {
    this._counterTotalForSession += 1;
  }
  setProMode(){
    const current = this._proMode
    this._proMode = !current
  }
  resetCounterTotalForSession() {
    this._counterTotalForSession = 0;
  }

  resetState() {
    this._serialIdsFC = {};
    this._flashStatus = Array(this._countPort).fill("Не прошито");
    this._loading = Array(this._countPort).fill(false);
    this._messageDB = Array(this._countPort).fill('Не добавлено');

  }

  get serialIdsFC() {
    return this._serialIdsFC;
  }

  get flashStatus() {
    return this._flashStatus;
  }

  get loading() {
    return this._loading;
  }

  get countPort() {
    return this._countPort;
  }
  get counterTotalForSession() {
    return this._counterTotalForSession;
  }
  get messageDB() {
    return this._messageDB;
  }
    get proMode(){
    return this._proMode
  }
}
