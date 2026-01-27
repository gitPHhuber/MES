const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const BeryllDefectRecordFile = sequelize.define(
        "BeryllDefectRecordFile",
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            defectRecordId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: "defect_record_id",
                references: {
                    model: "beryll_defect_records",
                    key: "id"
                },
                onDelete: "CASCADE"
            },
            fileName: {
                type: DataTypes.STRING(255),
                allowNull: false,
                field: "file_name",
                comment: "Имя файла на диске"
            },
            originalName: {
                type: DataTypes.STRING(255),
                allowNull: false,
                field: "original_name",
                comment: "Оригинальное имя файла"
            },
            filePath: {
                type: DataTypes.STRING(500),
                allowNull: false,
                field: "file_path",
                comment: "Относительный путь к файлу"
            },
            mimeType: {
                type: DataTypes.STRING(100),
                allowNull: true,
                field: "mime_type",
                comment: "MIME-тип файла"
            },
            fileSize: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "file_size",
                comment: "Размер файла в байтах"
            },
            uploadedById: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: "uploaded_by_id",
                references: {
                    model: "users",
                    key: "id"
                },
                onDelete: "SET NULL"
            }
        },
        {
            tableName: "beryll_defect_record_files",
            timestamps: true,
            underscored: true,
            indexes: [
                { fields: ["defect_record_id"] },
                { fields: ["uploaded_by_id"] }
            ]
        }
    );

    return BeryllDefectRecordFile;
};