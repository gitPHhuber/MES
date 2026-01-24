import { makeAutoObservable } from "mobx";
import { defectModelFull } from "src/types/DefectModel";
import { fcModelFull } from "src/types/BoardsForFlashModel";
import { pcModelFull } from "src/types/PCModel";
import { SessionModelFull } from "src/types/SessionModel";
import { userGetModel } from "src/types/UserModel";

export default class FlightControllerStore {

  private _sessions: SessionModelFull[] = [];
  private _defectCategories: defectModelFull[] = [];
  private _PCs: pcModelFull[] = [];
  private _FCs: fcModelFull[] = [];
  private _users: userGetModel[] = [];
  private _selectedPC: pcModelFull | null = null
  private _selectedDefect: defectModelFull | null = null
  private _selectedUser: userGetModel | null = null
  private _selectedStartDate: string | null = null
  private _selectedEndDate: string | null = null

  private _page: number = 1
  private _totalCount: number = 0
  private _limit: number = 30



  constructor() {
    makeAutoObservable(this); // здесь мобикс следит за изменениями этих переменных, принимает контекст текущего класса
  }

  
  setDefectCategories(defectCategories: defectModelFull[]) {
    this._defectCategories = defectCategories;
  }
  setPCs(PCs: pcModelFull[]) {
    this._PCs = PCs;
  }
  setFCs(FCs: fcModelFull[]) {
    this._FCs = FCs;
  }
  setSessions(sessions: SessionModelFull[]) {
    this._sessions = sessions;
  }
  setUsers(users: userGetModel[]) {
    this._users = users;
  }
  setSelectedStartDate(date: string) {
    this._selectedStartDate = date;
  }
  setSelectedEndDate(date: string) {
    this._selectedEndDate = date;
  }
  
  
  setSelectedPC(PC: pcModelFull | null) {
    this.setPage(1)
    this._selectedPC = PC;
  }
  setSelectedDefect(defect: defectModelFull | null) {
    this.setPage(1)
    this._selectedDefect = defect;
  }
  setSelectedUser(user: userGetModel | null) {
    this.setPage(1)
    this._selectedUser = user;
  }
  
  setPage(page: number) {
    this._page = page
  }
  setTotalCount(totalCount: number) {
    this._totalCount = totalCount
  }
  setLimit(limit: number) {
    this._limit = limit
  }
  resetSelectedDefect() {
    this._selectedDefect = null
  }
  
  resetAll() {
     this._selectedPC = null;
  this._selectedDefect = null;
  this._selectedUser = null;
  this._selectedStartDate = null;
  this._selectedEndDate = null;
  this._page = 1;
  }
  get defectCategories() {
    return this._defectCategories;
  }
  get PCs() {
    return this._PCs;
  }
  get FCs() {
    return this._FCs;
  }
  get sessions() {
    return this._sessions;
  }
  get users() {
    return this._users;
  }
  get selectedPC() {
    return this._selectedPC
  }
  get selectedDefect() {
    return this._selectedDefect
  }
  get selectedUser() {
    return this._selectedUser
  }
  get selectedStartDate() {
    return this._selectedStartDate
  }
  get selectedEndDate() {
    return this._selectedEndDate
  }
  get page() {
    return this._page
  }
  get totalCount() {
    return this._totalCount
  }
  get limit() {
    return this._limit
  }
}
