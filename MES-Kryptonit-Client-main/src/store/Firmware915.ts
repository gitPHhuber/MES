import { makeAutoObservable } from "mobx";

export default class Firmware915Store {
    _counterTotalForSession: number = 0;
    _countPort: number = 6
    _macAddress: { [key: number]: string } = {};
    _flashStatus: string[] = Array(this._countPort).fill("Не прошито");
    _loading: boolean[] = Array(this._countPort).fill(false);
    _loadingMAC: boolean[] = Array(this._countPort).fill(false);
    _messageDB: string[] = Array(this._countPort).fill("Не добавлено")
    _eraseFlashStatus: string[] = Array(this._countPort).fill("Не сброшено")

    constructor() {
        makeAutoObservable(this);
    }

    setMacAddress(port: number, macAddress: string) {
        this._macAddress[port] = macAddress;
    }

    resetMacAddress() {
        this._macAddress = {};
    }

    setFlashStatus(port: number, status: string) {
        this._flashStatus[port] = status;
    }

    setLoading(port: number, isLoading: boolean) {
        this._loading[port] = isLoading;
    }
    setLoadingMAC(port: number, isLoading: boolean) {
        this._loadingMAC[port] = isLoading;
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
    resetCounterTotalForSession() {
        this._counterTotalForSession = 0;
    }

    setEraseFlashStatus(port: number, status: string) {
        this._eraseFlashStatus[port] = status
    }
    resetState() {
        this._macAddress = {};
        this._flashStatus = Array(this._countPort).fill("Не прошито");
        this._loading = Array(this._countPort).fill(false);
        this._messageDB = Array(this._countPort).fill('Не добавлено');
        this._eraseFlashStatus = Array(this._countPort).fill("Не сброшено")

    }

    get macAddress() {
        return this._macAddress;
    }

    get flashStatus() {
        return this._flashStatus;
    }

    get loading() {
        return this._loading;
    }
    get loadingMAC() {
        return this._loadingMAC;
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
    get eraseFlashStatus() {
        return this._eraseFlashStatus
    }
}
