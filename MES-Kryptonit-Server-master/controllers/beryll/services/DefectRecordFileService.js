
const path = require("path");
const fs = require("fs");

const DEFECT_FILES_DIR = path.join(__dirname, "../../../static/defect-records");


if (!fs.existsSync(DEFECT_FILES_DIR)) {
    fs.mkdirSync(DEFECT_FILES_DIR, { recursive: true });
}

class DefectRecordFileService {
    
    /**
     * Получить список файлов записи о браке
     * @param {number} defectRecordId - ID записи
     * @returns {Promise<Array>}
     */
    async getFiles(defectRecordId) {
        const { BeryllDefectRecordFile, User } = require("../../../models");
        
        const files = await BeryllDefectRecordFile.findAll({
            where: { defectRecordId },
            include: [
                {
                    model: User,
                    as: "uploadedBy",
                    attributes: ["id", "name", "surname"]
                }
            ],
            order: [["createdAt", "DESC"]]
        });
        
        return files;
    }
    
    /**
     * Получить файл по ID
     * @param {number} fileId - ID файла
     * @returns {Promise<Object|null>}
     */
    async getFileById(fileId) {
        const { BeryllDefectRecordFile, User } = require("../../../models");
        
        const file = await BeryllDefectRecordFile.findByPk(fileId, {
            include: [
                {
                    model: User,
                    as: "uploadedBy",
                    attributes: ["id", "name", "surname"]
                }
            ]
        });
        
        return file;
    }
    
    /**
     * Добавить файл к записи о браке
     * @param {number} defectRecordId - ID записи
     * @param {Object} fileData - Данные файла
     * @param {string} fileData.fileName - Имя файла на диске
     * @param {string} fileData.originalName - Оригинальное имя файла
     * @param {string} fileData.filePath - Относительный путь к файлу
     * @param {string} fileData.mimeType - MIME-тип файла
     * @param {number} fileData.fileSize - Размер файла в байтах
     * @param {number} fileData.uploadedById - ID загрузившего пользователя
     * @returns {Promise<Object>}
     */
    async addFile(defectRecordId, fileData) {
        const { 
            BeryllDefectRecordFile, 
            BeryllHistory, 
            BeryllDefectRecord, 
            BeryllServer 
        } = require("../../../models");
        
        const defect = await BeryllDefectRecord.findByPk(defectRecordId, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        
        if (!defect) {
            throw new Error("Запись о браке не найдена");
        }
        
        const file = await BeryllDefectRecordFile.create({
            defectRecordId,
            fileName: fileData.fileName,
            originalName: fileData.originalName,
            filePath: fileData.filePath,
            mimeType: fileData.mimeType,
            fileSize: fileData.fileSize,
            uploadedById: fileData.uploadedById
        });
        
        await BeryllHistory.create({
            serverId: defect.serverId,
            serverIp: defect.server?.ipAddress,
            serverHostname: defect.server?.hostname,
            userId: fileData.uploadedById,
            action: "DEFECT_RECORD_FILE_UPLOADED",
            comment: `Загружен файл: ${fileData.originalName}`,
            metadata: {
                defectRecordId,
                fileId: file.id,
                fileName: fileData.originalName,
                fileSize: fileData.fileSize,
                mimeType: fileData.mimeType
            }
        });
        
        return file;
    }
    
    /**
     * Удалить файл
     * @param {number} fileId - ID файла
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>}
     */
    async deleteFile(fileId, userId) {
        const { 
            BeryllDefectRecordFile, 
            BeryllHistory, 
            BeryllDefectRecord, 
            BeryllServer 
        } = require("../../../models");
        
        const file = await BeryllDefectRecordFile.findByPk(fileId, {
            include: [{
                model: BeryllDefectRecord,
                as: "defectRecord",
                include: [{ model: BeryllServer, as: "server" }]
            }]
        });
        
        if (!file) {
            throw new Error("Файл не найден");
        }
        
        const fullPath = path.join(DEFECT_FILES_DIR, file.filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        
        if (file.defectRecord) {
            await BeryllHistory.create({
                serverId: file.defectRecord.serverId,
                serverIp: file.defectRecord.server?.ipAddress,
                serverHostname: file.defectRecord.server?.hostname,
                userId,
                action: "DEFECT_RECORD_FILE_DELETED",
                comment: `Удалён файл: ${file.originalName}`,
                metadata: {
                    defectRecordId: file.defectRecordId,
                    fileId: file.id,
                    fileName: file.originalName
                }
            });
        }
        
        await file.destroy();
        
        return { success: true, message: "Файл удалён" };
    }
    
    /**
     * Сохранить файл на диск
     * @param {number} defectRecordId - ID записи о браке
     * @param {Object} file - Объект файла из express-fileupload
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>}
     */
    async saveFile(defectRecordId, file, userId) {
        const recordDir = path.join(DEFECT_FILES_DIR, String(defectRecordId));
        if (!fs.existsSync(recordDir)) {
            fs.mkdirSync(recordDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${timestamp}_${safeOriginalName}`;
        const filePath = path.join(recordDir, fileName);
        const relativePath = path.join(String(defectRecordId), fileName);
        
        await file.mv(filePath);
        
        const fileRecord = await this.addFile(defectRecordId, {
            fileName,
            originalName: file.name,
            filePath: relativePath,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedById: userId
        });
        
        return fileRecord;
    }
    
    /**
     * Получить полный путь к файлу для скачивания
     * @param {number} fileId - ID файла
     * @returns {Promise<Object>} { fullPath, originalName, mimeType }
     */
    async getFileForDownload(fileId) {
        const file = await this.getFileById(fileId);
        
        if (!file) {
            throw new Error("Файл не найден");
        }
        
        const fullPath = path.join(DEFECT_FILES_DIR, file.filePath);
        
        if (!fs.existsSync(fullPath)) {
            throw new Error("Файл не найден на диске");
        }
        
        return {
            fullPath,
            originalName: file.originalName,
            mimeType: file.mimeType || "application/octet-stream"
        };
    }
    
    /**
     * Получить количество файлов записи о браке
     * @param {number} defectRecordId - ID записи
     * @returns {Promise<number>}
     */
    async getFilesCount(defectRecordId) {
        const { BeryllDefectRecordFile } = require("../../../models");
        
        const count = await BeryllDefectRecordFile.count({
            where: { defectRecordId }
        });
        
        return count;
    }
    
    /**
     * Удалить все файлы записи о браке
     * @param {number} defectRecordId - ID записи
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>}
     */
    async deleteAllFiles(defectRecordId, userId) {
        const files = await this.getFiles(defectRecordId);
        
        let deletedCount = 0;
        for (const file of files) {
            try {
                await this.deleteFile(file.id, userId);
                deletedCount++;
            } catch (error) {
                console.error(`Ошибка удаления файла ${file.id}:`, error.message);
            }
        }
        
        const recordDir = path.join(DEFECT_FILES_DIR, String(defectRecordId));
        if (fs.existsSync(recordDir)) {
            try {
                fs.rmdirSync(recordDir);
            } catch (e) {

            }
        }
        
        return { 
            success: true, 
            deletedCount, 
            message: `Удалено ${deletedCount} файлов` 
        };
    }
}

module.exports = new DefectRecordFileService();