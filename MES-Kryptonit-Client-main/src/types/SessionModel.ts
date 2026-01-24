export interface SessionModelFull {
    id: number;
    online: boolean;
    userId: number;
    PCId: number;
    createdAt: string;
    updatedAt: string;
}
export interface SessionModelShort {
    online: boolean;
    userId: number;
    PCId: number;
}