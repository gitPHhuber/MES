import { makeAutoObservable } from "mobx";

export default class FirmwareCoralBStore {
    _firmwareVersion: string | null = null;
    _SAW_mode: boolean | null = null;
    _counterTotalForSession: number = 0;
    _countPort: number = 4
    _serial: { [key: number]: string } = {};
    _flashStatus: string[] = Array(this._countPort).fill("Не прошито");
    _loading: boolean[] = Array(this._countPort).fill(false);
    _messageDB: string[] = Array(this._countPort).fill("Не добавлено")

    constructor() {
        makeAutoObservable(this);
    }
    setFirmwareVersion(version: string) {
        this._firmwareVersion = version;
    }

    setSAW_mode(saw:boolean){
        this._SAW_mode= saw;
    }

    setSerial(port: number, serial: string) {
        this._serial[port] = serial;
    }

    resetSerial() {
        this._serial = {};
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

    // setCountPort(count: number) {
    //     this._countPort = count;
    // }
    // setCountPortPlus() {
    //     this._countPort += 1;
    // }
    // setCountPortMinus() {
    //     this._countPort -= 1;
    // }

    setCounterTotalForSessionPlus() {
        this._counterTotalForSession += 1;
    }
    resetCounterTotalForSession() {
        this._counterTotalForSession = 0;
    }


    resetState() {
        this._serial = {};
        this._flashStatus = Array(this._countPort).fill("Не прошито");
        this._loading = Array(this._countPort).fill(false);
        this._messageDB = Array(this._countPort).fill('Не добавлено');

    }

    get firmwareVersion() {
        return this._firmwareVersion
    }

    get SAW_mode(){
        return this._SAW_mode
    }

    get serial() {
        return this._serial;
    }

    get flashStatus() {
        return this._flashStatus;
    }

    get loading() {
        return this._loading;
    }

    get messageDB() {
        return this._messageDB;
    }
    get countPort() {
        return this._countPort;
    }
    get counterTotalForSession() {
        return this._counterTotalForSession;
    }

}
