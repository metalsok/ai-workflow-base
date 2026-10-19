import { In, type QueryRunner, type Table } from 'typeorm';
import { DatabaseColumn } from './postgres-metadata.entity.js';

// Compare PostgreSQL's inspected schema, including details omitted by schema-diff
// generation (constraint names, extra indexes, precision and cascade rules).
function tableShape(table: Table) {
  return {
    name: table.name.split('.').at(-1),
    columns: table.columns
      .map((c) => ({
        name: c.name,
        type: c.type,
        length: c.length,
        precision: c.precision,
        scale: c.scale,
        default: c.default,
        nullable: c.isNullable,
        primary: c.isPrimary,
        primaryKey: c.primaryKeyConstraintName,
        generated: c.isGenerated,
        generation: c.generationStrategy,
        unique: c.isUnique,
        array: c.isArray,
        comment: c.comment,
        charset: c.charset,
        collation: c.collation,
        enum: c.enum,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indexes: table.indices
      .map((i) => ({
        name: i.name,
        columns: i.columnNames,
        unique: i.isUnique,
        where: i.where,
        spatial: i.isSpatial,
        fulltext: i.isFulltext,
      }))
      .sort((a, b) => a.name!.localeCompare(b.name!)),
    uniques: table.uniques
      .map((u) => ({
        name: u.name,
        columns: u.columnNames,
        deferrable: u.deferrable,
      }))
      .sort((a, b) => a.name!.localeCompare(b.name!)),
    foreignKeys: table.foreignKeys
      .map((f) => ({
        name: f.name,
        columns: f.columnNames,
        table: f.referencedTableName.split('.').at(-1),
        referencedColumns: f.referencedColumnNames,
        onDelete: f.onDelete,
        onUpdate: f.onUpdate,
        deferrable: f.deferrable,
      }))
      .sort((a, b) => a.name!.localeCompare(b.name!)),
    checks: table.checks.map((c) => ({
      name: c.name,
      expression: c.expression,
    })),
    exclusions: table.exclusions.map((c) => ({
      name: c.name,
      expression: c.expression,
    })),
  };
}
export async function inspectSchema(runner: QueryRunner) {
  const tables = await currentSchemaTables(runner);
  const applicationTables = tables.filter(
    (t) => t.name.split('.').at(-1) !== 'typeorm_migrations',
  );
  const defaults = applicationTables.length
    ? await runner.manager.getRepository(DatabaseColumn).findBy({
        tableSchema: await runner.getCurrentSchema(),
        tableName: In(applicationTables.map((t) => t.name.split('.').at(-1)!)),
      })
    : [];
  const shapes = applicationTables.map(tableShape);
  for (const table of shapes)
    for (const column of table.columns) {
      column.default =
        defaults.find(
          (c) => c.tableName === table.name && c.columnName === column.name,
        )?.default ?? undefined;
    }
  return shapes.sort((a, b) => a.name!.localeCompare(b.name!));
}

export async function currentSchemaTables(runner: QueryRunner) {
  const schema = await runner.getCurrentSchema();
  return (await runner.getTables()).filter((table) => table.schema === schema);
}
