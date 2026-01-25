import { makeAutoObservable } from "mobx";
import { userGetModel } from "src/types/UserModel";

export interface TeamModel {
    id: number;
    title: string;
    productionSectionId: number;
    teamLead: userGetModel | null;
    users: userGetModel[]; // Сотрудники
}

export interface SectionModel {
    id: number;
    title: string;
    manager: userGetModel | null;
    production_teams: TeamModel[]; // Sequelize возвращает это поле так
}

export default class StructureStore {
    sections: SectionModel[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    setSections(sections: SectionModel[]) {
        this.sections = sections;
    }
}
