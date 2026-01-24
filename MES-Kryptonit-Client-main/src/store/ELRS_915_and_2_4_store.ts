import { makeAutoObservable } from "mobx";
import { defectModelFull } from "src/types/DefectModel";
import { ELRS2_4ModelFull, ELRS915ModelFull } from "src/types/BoardsForFlashModel";
import { pcModelFull } from "src/types/PCModel";
import { SessionModelFull } from "src/types/SessionModel";
import { userGetModel } from "src/types/UserModel";

export default class ELRSStore {

    private _sessions: SessionModelFull[] = [];
    private _defect_915_Categories: defectModelFull[] = [];
    private _defect_2_4_Categories: defectModelFull[] = [];
    private _PCs: pcModelFull[] = [];
    private _ELRS915: ELRS915ModelFull[] = [];
    private _ELRS_2_4: ELRS2_4ModelFull[] = [];
    private _users: userGetModel[] = [];
    private _selectedPC: pcModelFull | null = null
    private _selectedDefect: defectModelFull | null = null
    private _selectedUser: userGetModel | null = null
    private _selectedDate: string | null = null
    private _page: number = 1
    private _totalCount: number = 0
    private _limit: number = 30



    constructor() {
        makeAutoObservable(this); // здесь мобикс следит за изменениями этих переменных, принимает контекст текущего класса
    }



    setDefect_915_Categories(defectCategories: defectModelFull[]) {
        this._defect_915_Categories = defectCategories;
    }
    setDefect_2_4_Categories(defectCategories: defectModelFull[]) {
        this._defect_2_4_Categories = defectCategories;
    }
    setPCs(PCs: pcModelFull[]) {
        this._PCs = PCs;
    }

    setELRS915s(boards: ELRS915ModelFull[]) {
        this._ELRS915 = boards;
    }
    setELRS_2_4s(boards: ELRS2_4ModelFull[]) {
        this._ELRS_2_4 = boards;
    }

    setSessions(sessions: SessionModelFull[]) {
        this._sessions = sessions;
    }
    setUsers(users: userGetModel[]) {
        this._users = users;
    }
    setSelectedDate(date: string) {
        this._selectedDate = date;
    }


    setSelectedPC(PC: pcModelFull) {
        this.setPage(1)
        this._selectedPC = PC;
    }
    setSelectedDefect(defect: defectModelFull) {
        this.setPage(1)
        this._selectedDefect = defect;
    }
    setSelectedUser(user: userGetModel) {
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

    get defect_915_Categories() {
        return this._defect_915_Categories;
    }
    get defect_2_4_Categories() {
        return this._defect_2_4_Categories;
    }

    get ELRS915() {
        return this._ELRS915;
    }
    get ELRS2_4() {
        return this._ELRS_2_4;
    }

    get PCs() {
        return this._PCs;
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
    get selectedDate() {
        return this._selectedDate
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
