"use strict";

const STATUS_TRANSITIONS = {
  NEW: [
    { action: "start_diagnosis", to: "DIAGNOSING", label: "Начать диагностику" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  DIAGNOSING: [
    { action: "complete_diagnosis", to: "WAITING_PARTS", label: "Завершить диагностику" },
    { action: "start_repair", to: "REPAIRING", label: "Начать ремонт" },
    { action: "send_to_yadro", to: "SENT_TO_YADRO", label: "Отправить в Ядро" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  WAITING_PARTS: [
    { action: "start_repair", to: "REPAIRING", label: "Начать ремонт" },
    { action: "send_to_yadro", to: "SENT_TO_YADRO", label: "Отправить в Ядро" },
    { action: "scrap", to: "SCRAPPED", label: "Списать" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  REPAIRING: [
    { action: "send_to_yadro", to: "SENT_TO_YADRO", label: "Отправить в Ядро" },
    { action: "resolve", to: "RESOLVED", label: "Завершить ремонт" },
    { action: "scrap", to: "SCRAPPED", label: "Списать" }
  ],
  SENT_TO_YADRO: [
    { action: "return_from_yadro", to: "RETURNED", label: "Получено из Ядро" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  RETURNED: [
    { action: "start_repair", to: "REPAIRING", label: "Начать ремонт" },
    { action: "resolve", to: "RESOLVED", label: "Завершить ремонт" },
    { action: "scrap", to: "SCRAPPED", label: "Списать" }
  ],
  RESOLVED: [
    { action: "close", to: "CLOSED", label: "Закрыть" }
  ],
  REPEATED: [
    { action: "start_diagnosis", to: "DIAGNOSING", label: "Начать диагностику" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  PENDING_DIAGNOSIS: [
    { action: "start_diagnosis", to: "DIAGNOSING", label: "Начать диагностику" },
    { action: "mark_diagnosed", to: "DIAGNOSED", label: "Диагноз подтверждён" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  DIAGNOSED: [
    { action: "request_approval", to: "WAITING_APPROVAL", label: "Ожидать одобрения" },
    { action: "reserve_parts", to: "PARTS_RESERVED", label: "Зарезервировать запчасти" },
    { action: "start_repair", to: "REPAIRING", label: "Начать ремонт" },
    { action: "send_to_yadro", to: "IN_YADRO_REPAIR", label: "Отправить в Ядро" },
    { action: "scrap", to: "SCRAPPED", label: "Списать" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  WAITING_APPROVAL: [
    { action: "reserve_parts", to: "PARTS_RESERVED", label: "Зарезервировать запчасти" },
    { action: "cancel", to: "CANCELLED", label: "Отменить" }
  ],
  PARTS_RESERVED: [
    { action: "start_repair", to: "REPAIRING", label: "Начать ремонт" },
    { action: "send_to_yadro", to: "IN_YADRO_REPAIR", label: "Отправить в Ядро" },
    { action: "issue_substitute", to: "SUBSTITUTE_ISSUED", label: "Выдать подменный сервер" },
    { action: "scrap", to: "SCRAPPED", label: "Списать" }
  ],
  REPAIRED_LOCALLY: [
    { action: "resolve", to: "RESOLVED", label: "Завершить" },
    { action: "close", to: "CLOSED", label: "Закрыть" }
  ],
  IN_YADRO_REPAIR: [
    { action: "return_from_yadro", to: "RETURNED", label: "Получено из Ядро" },
    { action: "issue_substitute", to: "SUBSTITUTE_ISSUED", label: "Выдать подменный сервер" }
  ],
  SUBSTITUTE_ISSUED: [
    { action: "return_substitute", to: "REPAIRING", label: "Вернуть подменный сервер" },
    { action: "close", to: "CLOSED", label: "Закрыть" }
  ],
  SCRAPPED: [],
  CANCELLED: [],
  CLOSED: []
};

class DefectStateMachine {
  getAvailableActions(status) {
    return STATUS_TRANSITIONS[status] || [];
  }

  canTransition(fromStatus, toStatus) {
    if (fromStatus === toStatus) {
      return true;
    }

    const actions = this.getAvailableActions(fromStatus);
    return actions.some((action) => action.to === toStatus);
  }

  assertTransition(fromStatus, toStatus) {
    if (!this.canTransition(fromStatus, toStatus)) {
      throw new Error(`Невозможно перейти из статуса ${fromStatus} в ${toStatus}`);
    }
  }
}

module.exports = new DefectStateMachine();
