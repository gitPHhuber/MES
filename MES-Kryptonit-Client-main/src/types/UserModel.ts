export interface userModel {
    exp: number;
    iat: number;
    id: number;
    login: string;
    name: string;
    //  список ролей для подсказок TS + string для совместимости
    role: "SUPER_ADMIN" | "PRODUCTION_CHIEF" | "TECHNOLOGIST" | "WAREHOUSE_MASTER" | "ASSEMBLER" | "QC_ENGINEER" | "FIRMWARE_OPERATOR" | string;
    surname: string;
    img: string | null;
    abilities?: string[];
}

export interface userGetModel {
    id: number;
    login: string;
    password: string;
    role: string;
    name: string;
    surname: string;
    img: string | null;
    createdAt: string;
    updatedAt: string;
    abilities?: string[];
}

export interface userModelShort {
    login: string;
    password: string;
}