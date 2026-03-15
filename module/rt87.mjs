// Import document classes.
import { rt87Actor } from './documents/actor.mjs';
import { rt87Item } from './documents/item.mjs';
// Import sheet classes.
import { rt87ActorSheet } from './sheets/actor-sheet.mjs';
import { rt87ItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { RT87 } from './helpers/config.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

const collections = foundry.documents.collections;
const sheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.rt87 = {
  documents: {
    rt87Actor,
    rt87Item,
  },
  applications: {
    rt87ActorSheet,
    rt87ItemSheet,
  },
  utils: {
    rollItemMacro,
  },
  models,
};

Hooks.once('init', function () {
  // Add custom constants for configuration.
  CONFIG.RT87 = RT87;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d6',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = rt87Actor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.rt87Character,
    npc: models.rt87NPC,
  };
  CONFIG.Item.documentClass = rt87Item;
  CONFIG.Item.dataModels = {
    gear: models.rt87Gear,
    feature: models.rt87Feature,
    spell: models.rt87Spell,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', sheets.ActorSheet);
  collections.Actors.registerSheet('rt87', rt87ActorSheet, {
    makeDefault: true,
    label: 'RT87.SheetLabels.Actor',
  });
  collections.Items.unregisterSheet('core', sheets.ItemSheet);
  collections.Items.registerSheet('rt87', rt87ItemSheet, {
    makeDefault: true,
    label: 'RT87.SheetLabels.Item',
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});


/* -------------------------------------------- */
/*  Chat message roll outcome (pass/fail)       */
/* -------------------------------------------- */

// Outcome is stored in message flags because roll template may not receive toMessage options.
Hooks.on('renderChatMessage', (message, html, messageData) => {
  const rt87 = message.flags?.rt87;
  if (!rt87?.outcome) return;
  const outcome = rt87.outcome;
  const pass = rt87.pass;
  const $roll = html.find('.rt87-roll');
  if (!$roll.length) return;
  $roll.find('.dice-total').addClass(outcome);
  $roll.find('.rt87-outcome').html(pass ? '<span class="pass">Pass!</span>' : '<span class="fail">Fail!</span>');
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.rt87.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'rt87.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
