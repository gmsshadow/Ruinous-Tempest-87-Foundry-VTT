import rt87ActorBase from './base-actor.mjs';

export default class rt87Character extends rt87ActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'RT87.Actor.Character',
  ];

  /**
   * Migrate legacy data: rename armourSave.shield to armourSave.field (Field/Aura).
   * @override
   */
  static migrateData(source) {
    const data = super.migrateData?.(source) ?? foundry.utils.deepClone(source);
    // TypeDataModel receives the system object (armourSave at top level) or full document (under system)
    const armourSave = data.armourSave ?? data.system?.armourSave;
    if (armourSave?.shield !== undefined) {
      armourSave.field = armourSave.shield;
      delete armourSave.shield;
    }
    return data;
  }

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.RT87.abilities).reduce((obj, ability) => {
        obj[ability] = new fields.SchemaField({
          value: new fields.NumberField({
            ...requiredInteger,
            initial: 3,
            min: 0,
          }),
        });
        return obj;
      }, {})
    );

    schema.abilitiesPersonal = new fields.SchemaField(
    Object.keys(CONFIG.RT87.abilitiesPersonal).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 7, min: 0 }),
      });
      return obj;
    }, {})
  );

    schema.strengthAbilities = new fields.SchemaField(
    Object.keys(CONFIG.RT87.strengthAbilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 3, min: 0 }),
      });
      return obj;
    }, {})
  );

      schema.combatAbilities = new fields.SchemaField(
    Object.keys(CONFIG.RT87.combatAbilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
      });
      return obj;
    }, {})
  );

      schema.movementAbilities = new fields.SchemaField(
    Object.keys(CONFIG.RT87.movementAbilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 4, min: 0 }),
      });
      return obj;
    }, {})
  );

      schema.armourSave = new fields.SchemaField(
    Object.keys(CONFIG.RT87.armourSave).reduce((obj, ability) => {
        obj[ability] = new fields.SchemaField({
          value: new fields.NumberField({...requiredInteger,
            initial: 0,
            min: 0,
          }),
        });
        return obj;
      }, {})
    );

    return schema;
  }



  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Calculate the modifier using d20 rules.
      this.abilities[key].mod = Math.floor(
        (this.abilities[key].value - 6)
      );
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.RT87.abilities[key]) ?? key;
    }
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data;
  }
}
