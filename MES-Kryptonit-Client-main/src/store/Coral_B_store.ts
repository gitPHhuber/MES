import { makeAutoObservable } from "mobx";
import { Coral_B_ModelFull } from "src/types/BoardsForFlashModel";
import { defectModelFull } from "src/types/DefectModel";
import { pcModelFull } from "src/types/PCModel";
import { SessionModelFull } from "src/types/SessionModel";
import { userGetModel } from "src/types/UserModel";

export default class CoralBStore {

    private _sessions: SessionModelFull[] = [];
    private _defects_coral_B_categories: defectModelFull[] = [];
    private _PCs: pcModelFull[] = [];
    private _coralBs: Coral_B_ModelFull[] = [];
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

    setSessions(sessions: SessionModelFull[]) {
        this._sessions = sessions;
    }


    setDefect_coral_B_categories(defectCategories: defectModelFull[]) {
        this._defects_coral_B_categories = defectCategories;
    }

    setPCs(PCs: pcModelFull[]) {
        this._PCs = PCs;
    }

    setCoralBs(boards: Coral_B_ModelFull[]) {
        this._coralBs = boards;
    }

    setUsers(users: userGetModel[]) {
        this._users = users;
    }

    setSelectedPC(PC: pcModelFull) {
        this.setPage(1)
        this._selectedPC = PC;
    }

    setSelectedDate(date: string) {
        this._selectedDate = date;
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

    get sessions() {
        return this._sessions;
    }


    get defect_coral_B_categories() {
        return this._defects_coral_B_categories;
    }

    get coralBs() {
        return this._coralBs;
    }

    get users() {
        return this._users;
    }

    get PCs() {
        return this._PCs;
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
