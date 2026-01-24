export interface WarehouseUserShort {
  id: number;
  login: string;
  name: string;
  surname: string;
}

export interface WarehouseSectionShort {
  id: number;
  title: string;
}

export interface WarehouseTeamShort {
  id: number;
  title: string;
}

// Модель поставки
export interface SupplyModel {
  id: number;
  supplier: string | null;
  docNumber: string | null;
  status: string; 
  comment: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface InventoryBoxModel {
  id: number;
  supplyId: number | null;
  

  qrCode: string;
  shortCode: string | null; 

  label: string; 

  originType: string | null; 
  originId: number | null;  

 
  quantity: number; 
  unit: string;


  parentBoxId: number | null;


  boxNumber: string | null;
  kitNumber: string | null;
  projectName: string | null;
  batchName: string | null;
  
  status: string;
  notes: string | null;
  
  currentSectionId: number | null;
  currentTeamId: number | null;
  
  createdAt: string;
  updatedAt: string;
  
  section?: WarehouseSectionShort | null;
  team?: WarehouseTeamShort | null;
  currentSection?: WarehouseSectionShort | null; 
  currentTeam?: WarehouseTeamShort | null; 
  supply?: SupplyModel | null;
}

export interface WarehouseMovement {
  id: number;
  boxId: number;
  
  fromSectionId: number | null;
  toSectionId: number | null;
  fromTeamId: number | null;
  toTeamId: number | null;
  
  operation: string;
  statusAfter: string | null;
  
  deltaQty: number;
  goodQty?: number | null;
  scrapQty?: number | null;

  performedAt: string;
  comment: string | null;

  performedBy?: WarehouseUserShort;
  fromSection?: WarehouseSectionShort;
  toSection?: WarehouseSectionShort;
  fromTeam?: WarehouseTeamShort;
  toTeam?: WarehouseTeamShort;
}

export interface WarehouseDocument {
    id: number;
    boxId: number | null;
    number: string;
    type: string | null;
    date: string | null;
    fileUrl: string | null;
    comment: string | null;
    createdById: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: WarehouseUserShort;
}

export interface WarehouseUserShort {
  id: number;
  login: string;
  name: string;
  surname: string;
}

export interface WarehouseSectionShort {
  id: number;
  title: string;
}

export interface WarehouseTeamShort {
  id: number;
  title: string;
}

export interface SupplyModel {
  id: number;
  supplier: string | null;
  docNumber: string | null;
  status: string; 
  comment: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryBoxModel {
  id: number;
  supplyId: number | null;
  qrCode: string;
  shortCode: string | null;
  label: string;
  originType: string | null; 
  originId: number | null;   
  quantity: number; 
  unit: string;
  parentBoxId: number | null;
  kitNumber: string | null;
  projectName: string | null;
  batchName: string | null;
  status: string; 
  notes: string | null;
  currentSectionId: number | null;
  currentTeamId: number | null;
  createdAt: string;
  updatedAt: string;
  section?: WarehouseSectionShort | null;
  team?: WarehouseTeamShort | null;
  currentSection?: WarehouseSectionShort | null;
  currentTeam?: WarehouseTeamShort | null;
  supply?: SupplyModel | null;
}

export interface WarehouseMovement {
  id: number;
  boxId: number;
  documentId?: number | null;
  fromSectionId: number | null;
  toSectionId: number | null;
  fromTeamId: number | null;
  toTeamId: number | null;
  operation: string;        
  statusAfter: string | null;
  deltaQty: number;         
  goodQty?: number | null;  
  scrapQty?: number | null; 
  performedAt: string;
  comment: string | null;
  performedBy?: WarehouseUserShort;
  fromSection?: WarehouseSectionShort;
  toSection?: WarehouseSectionShort;
  fromTeam?: WarehouseTeamShort;
  toTeam?: WarehouseTeamShort;
}

export interface WarehouseDocument {
    id: number;
    boxId: number | null;
    number: string;
    type: string | null;
    date: string | null;
    fileUrl: string | null;
    comment: string | null;
    createdById: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: WarehouseUserShort;
}

export interface StockBalanceItem {
    label: string;
    originType: string | null;
    originId: number | null;
    unit: string;
    totalQuantity: string;
    boxCount: string;
}