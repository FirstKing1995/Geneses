/* Gênesis · números de balanceamento v0.4 (Etapas 1 a 4).
   Tudo que é ajuste de jogo mora aqui. Unidades: minutos e horas DE JOGO. */
(function (G) {
  'use strict';
  G.CFG = {
    VERSION: '0.4.0',
    SAVE_KEY: 'genesis.save.v1',
    // endereço do Web App do Google Apps Script (termina em /exec). Vazio = jogo só local.
    API_URL: 'https://script.google.com/macros/s/AKfycbzDy7z7jS8Xd9ejZINSNtR6_S7_3zmfqDaPa77NKVEoEFBY8N_F6-EHTvlsbX0-wGsQ/exec',
    CLOUD_SAVE_SEC: 180,

    // ---- mapa ----
    MAP: 128,            // 128 x 128 tiles
    TILE: 16,            // px por tile
    CHUNK: 16,           // tiles por bloco de render

    // ---- tempo: 1 hora real = 1 ano em 1x ----
    DAY_MIN: 1440,
    SEASON_DAYS: 15,
    YEAR_DAYS: 60,
    REAL_SEC_PER_DAY: 60,          // 1x: 1 dia = 1 min real
    SPEEDS: [0, 1, 2, 5],
    STEP_MIN: 2,                   // passo fixo da simulação
    START_HOUR: 7,

    // ---- clima ----
    SEASONS: ['Primavera', 'Verão', 'Outono', 'Inverno'],
    SEASON_TEMP: [16, 25, 11, 1],  // °C médio de cada estação
    SEASON_BLEND_DAYS: 3,          // transição suave nos últimos dias
    DAY_SWING: 5,                  // ±°C ao longo do dia
    DAY_RANDOM: 3,                 // sorteio ±°C por dia
    MOUNTAIN_COLD: -4, HILL_COLD: -2,
    RAIN_CHANCE: [0.30, 0.15, 0.35, 0.30],
    RAIN_COLD: -2, SNOW_COLD: -3,
    COMFORT: 16,                   // abaixo disso, perde calor

    // ---- necessidades (por hora de jogo) ----
    HUNGER_H: 80 / 24,
    THIRST_H: 120 / 24, THIRST_SUMMER: 1.3,
    ENERGY_H: 5,
    SLEEP_GROUND_H: 9, SLEEP_TENT_H: 12, SLEEP_TENT2_H: 13,
    SOCIAL_H: 30 / 24, CHAT_SOCIAL_H: 70,
    SLEEP_METABOLISM: 0.6,         // fome e sede caem mais devagar dormindo
    // frio: o calor do corpo cai até um piso que depende da temperatura
    // piso = 100 - (conforto - T) * COLD_SLOPE  -> 3 °C: 22 · -4 °C: 0
    COLD_SLOPE: 6, COLD_RATE: 5, COLD_RATE_DEG: 0.5,
    WARM_GAIN: 6, WARM_GAIN_DEG: 1.2,
    HEALTH_DAY: { fome: 35, sede: 70, frio: 90 },   // perda por dia com a necessidade em zero
    HYPOTHERMIA_BELOW: 10, HYPOTHERMIA_DAY: 30,
    HEALTH_REGEN_DAY: 18,
    PREGNANT_ENERGY: 1.3, PREGNANT_HUNGER: 1.3,     // grávida cansa e come mais

    // ---- comida e água ----
    FRUIT_FOOD: 25, FISH_COOKED: 45, FISH_RAW: 22, WATER_DRINK: 40,
    START_STOCK: { madeira: 0, pedra: 0, agua: 0, frutas: 8, peixe: 0 },
    ROT_FRUIT: 0.04, ROT_FISH: 0.08,            // parte do estoque que estraga por dia
    ROT_SEASON: [1, 1.5, 1, 0.3],               // verão apressa, inverno conserva

    // ---- movimento ----
    WALK_MIN_PER_TILE: 8,
    COST: [Infinity, 2.5, 2.5, 1.1, 1, 1.25, 1.15, 1.4, 1],   // por tipo de tile
    SNOW_SLOW: 1.15,

    // ---- trabalho ----
    CARRY: 10,
    CHOP_MIN: 150, TREE_WOOD: 8, TREE_REGROW_DAYS: 45,
    MINE_MIN: 110, ROCK_STONE: 4,
    HARVEST_MIN: 10, HARVEST_FRUIT_MIN: 8,
    BUSH_MAX: 3, BUSH_DAYS_PER_FRUIT: [4, 4, 6, 0],   // 0 = não produz
    WATER_MIN: 20, WATER_TRIP: 6, WATER_CAP: 30,
    FISH_SESSION: 180, FISH_ROLL: 30, FISH_CHANCE: 0.14, FISH_CHANCE_LVL: 0.03,
    FISH_WINTER: 0.5, FISH_MAX: 4,
    SEARCH_MAX: 55,                // custo máx. de busca de alvos
    BUILD_PASS_COST: 6,            // passar por dentro de uma obra custa 6x (só quando não há outro jeito)

    // ---- fogo ----
    FIRE_CAP: 8, FIRE_BURN_H: 5, FIRE_RAIN: 1.5, FIRE_REFUEL_AT: 3,
    FIRE_HEAT: 22, FIRE_FULL_R: 1.6, FIRE_MAX_R: 5,
    FIRE_SEATS: 4, FIRE_CROWD: 0.4,   // quem dorme ao relento: 4 cabem no calor da fogueira, o resto pega só 40%
    SLEEP_BY_FIRE: 25,             // com o calor do corpo abaixo disso, dorme junto do fogo e termina de se aquecer antes de dormir

    // ---- habilidades ----
    SKILL_XP_DIV: 3, SKILL_BONUS: 0.06, SKILL_MAX: 10,

    // ---- construções ----
    BUILD: {
      fogueira: { name: 'Fogueira', w: 1, h: 1, cost: { madeira: 4, pedra: 4 }, work: 60,
        desc: 'Aquece num raio de 5 tiles, ilumina a noite e cozinha peixe.' },
      // cap: lugares (adulto e jovem ocupam 2, criança 1, bebê vai no colo)
      barraca: { name: 'Barraca simples', w: 2, h: 2, cost: { madeira: 14 }, work: 240, heat: 8, cap: 5, level: 1,
        desc: '+8 °C para quem dorme. Cabe um casal e uma criança.' },
      barraca2: { name: 'Barraca avançada', w: 2, h: 2, cost: { madeira: 12, pedra: 8 }, work: 360, heat: 12, cap: 6, level: 2,
        from: 'barraca', desc: '+12 °C, o melhor sono da Era. Cabe um casal e duas crianças.' },
    },

    // ---- névoa: Deus vê e age só onde o povo já esteve ----

    SEE_CAMP: 10, SEE_R: 6, SEE_OLD_SAVE: 22,


    // ---- IA ----
    VONTADE_W: [0, 0.5, 1, 1.6],
    WORK_BASE: 32, WORK_CAP: 75, CRITICAL: 15, CRITICAL_BONUS: 70, EVENING_BONUS: 18,
    DEFAULT_VONTADES: { frutas: 2, agua: 2, madeira: 2, pedra: 1, pesca: 2, construir: 2, fogo: 3 },
    REEVAL_MIN: 20,

    // ---- Deus (Etapa 2) ----
    FAITH_START: 50, POWER_START: 15, POWER_MAX: 100, POWER_PER_FAITH_H: 0.22,
    PRAYER_HOURS: 12, PRAYER_COOLDOWN_H: 24, PRAYER_ANSWERED_COOLDOWN_H: 12,
    FAITH_ANSWER: 15, FAITH_ANSWER_SEEN: 6, FAITH_IGNORED: -8, FAITH_IGNORED_SEEN: -2,
    FAITH_MIRACLE_SEEN: 3, FAITH_DEATH: -8,
    CALOR_HEAT: 18, CALOR_R: 5, CALOR_HOURS: 12,
    CHUVA_R: 12, CHUVA_HOURS: 6, CHUVA_FRUIT: 2, CHUVA_WATER: 10,
    RAIO_R: 0.9, RAIO_DAMAGE: 35,

    // ---- tempo com o jogo fechado ----
    OFFLINE_RATE: 0.1, OFFLINE_MAX_DAYS: 180, OFFLINE_MIN_SEC: 120, OFFLINE_HEALTH_FLOOR: 25,

    // ---- metas do Ato 1 ----
    GOAL_FOOD: 60, GOAL_WOOD: 60,
    GOAL_FOOD_DAYS: 10, GOAL_PEOPLE: 6,

    // ---- família (Etapa 3) · tempo em anos de jogo (1 ano = 60 dias = 1 h real em 1x) ----
    CHILD_HELP_AGE: 7, OLD_AGE: 60, CARRY_CHILD: 5,
    AFETO_START: 60, AFETO_CHAT: 2, AFETO_NIGHT: 1, AFETO_MIN: 40, AFETO_DECAY: 0.5,
    COUPLE_TALKS: 6, COUPLE_DAILY: 0.1,
    FERTILE_MAX: 45, BIRTH_SPACING_Y: 1.5, CONCEIVE_NIGHT: 0.06,
    PREGNANCY_Y: 0.75, PREG_KNOWN_DAYS: 6, LATE_PREG_DAYS: 10,
    LABOR_H: 4, BIRTH_RISK: 0.15, BIRTH_RISK_TENT: -0.05, BIRTH_RISK_FIRE: -0.03, BIRTH_RISK_WEAK: 0.1,
    LABOR_HARD_DMG_H: 12, BIRTH_LOSS_HARD: 0.25,
    NURSE_COST: 4, TRAIT_INHERIT: 0.5,
    OLD_DEATH_BASE: 0.03, OLD_DEATH_STEP: 0.02,
    CURA_HEAL: 60,

    // ---- Narrador (Etapa 4) · dias de jogo ----
    // gap: dias entre desastres · sev: força dos desastres · goodGap: dias entre alívios
    // small: primeiro dia com um aperto pequeno (tempestade) · start: primeiro dia com desastre grande
    // quiet: dias sem nada acontecer que o diretor tolera antes de puxar um alívio (ou um aperto pequeno)
    NARR_DEFAULT: 'equilibrado',
    NARRADORES: {
      // aim: chance de nevasca em cada inverno e de seca em cada verão
      pacifico: { name: 'Pacífico', desc: 'Desastres raros e brandos. Para ver a família crescer.', gap: [24, 34], sev: 0.7, goodGap: [16, 24], small: 42, start: 75, aim: [0.6, 0.35], quiet: 15 },
      equilibrado: { name: 'Equilibrado', desc: 'Aperto e alívio em ritmo de história. O jeito pensado para o jogo.', gap: [14, 20], sev: 1, goodGap: [20, 30], small: 32, start: 60, aim: [0.8, 0.55], quiet: 11 },
      implacavel: { name: 'Implacável', desc: 'Desastres frequentes e duros. Para ser posto à prova.', gap: [8, 12], sev: 1.35, goodGap: [26, 38], small: 24, start: 60, aim: [0.95, 0.75], quiet: 8 },
    },
    NARR_LOSS_DAYS: 10,            // depois de uma morte: respiro e, se der, um alívio
    NARR_CALM_FOOD: 15,            // comida para 15 dias e todos bem: o aperto vem mais cedo
    NEVASCA_COLD: -6, NEVASCA_DAYS: [1.5, 2.5], NEVASCA_WALK: 0.75, NEVASCA_FIRE: 1.8, NEVASCA_WORK: 0.35, NEVASCA_FISH: 0.3,
    SECA_DAYS: [9, 13], SECA_THIRST: 1.35, SECA_HEAT: 3, SECA_WATER: 0.5, SECA_FISH: 0.6, SECA_WILT: 0.35,
    TEMPESTADE_H: [4, 7], TEMPESTADE_COLD: -4,
    LOBO_BITE: 16, LOBO_BITE_MIN: 15, LOBO_BITES: 2, LOBO_BITES_PERSON: 3, LOBO_STEAL: 6, LOBO_FIRE_R: 4.5, LOBO_SEE: 7, LOBO_SPEED: 1.25,
    FARTURA_DAYS: 8, FARTURA_R: 26, PIRACEMA_DAYS: 6, PIRACEMA_FISH: 1.8, VERANICO_HEAT: 6, VERANICO_DAYS: [2, 3], MEL_FOOD: 15, MEL_DAYS: 60,
    ANDARILHO_MAX_POP: 12, ANDARILHO_DAYS: 120,
    SEGUNDO_CASAL_H: 30,           // horas depois do 18º aniversário do primogênito
  };
})(globalThis.G = globalThis.G || {});
