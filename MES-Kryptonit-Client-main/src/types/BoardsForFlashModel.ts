export interface fcModelFull {
    id: number;
    unique_device_id: string;
    firmware: boolean;
    stand_test: boolean;
    sessionId: number;
    categoryDefectId: number;
    createdAt: string;
    updatedAt: string;
}
export interface fcModelMed {
    id: number;
    firmware: boolean;
    sessionId: number;
    categoryDefectId: number;
}

export interface fcModelShort {
    unique_device_id: string;
    firmware: boolean;
    sessionId: number;
    categoryDefectId: number;
}

export interface ELRS915ModelFull {
    id: number;
    MAC_address: string;
    firmware: boolean;
    sessionId: number;
    categoryDefect915Id: number;
    firmwareVersion: string;
    createdAt: string;
    updatedAt: string;
}

export interface ELRS2_4ModelFull {
    id: number;
    MAC_address: string;
    firmware: boolean;
    sessionId: number;
    categoryDefect24Id: number;
    createdAt: string;
    updatedAt: string;
}


export interface Coral_B_ModelFull {
    id: number;
    serial: string;
    firmware: boolean;
    SAW_filter: boolean;
    firmwareVersion: string;
    sessionId: number;
    categoryDefectCoralBId: number;
    createdAt: string;
    updatedAt: string;
}