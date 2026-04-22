export enum MAP_TYPE_ENUM {
    FOREST = 'forest',
}


// 全局事件枚举，标识游戏内的全局事件，用于事件订阅/发布
export enum EVENT_ENUM {
  JOYSTICK_AXIS = 'JOYSTICK_AXIS',
  PLAYER_TAKE_DAMAGE = 'PLAYER_TAKE_DAMAGE',
  ENEMY_TAKE_DAMAGE = 'ENEMY_TAKE_DAMAGE',
  PLAYER_LEVEL_UP = 'PLAYER_LEVEL_UP',
  ENEMY_DIED = 'ENEMY_DIED',
}


// 状态机变量类型枚举，标识状态机变量的类型
export enum FSM_PARAMS_TYPE_ENUM {
  NUMBER = 'NUMBER',
  TRIGGER = 'TRIGGER',
}


// 状态机名称枚举，标识状态机的名称
export enum PARAMS_NAME_ENUM {
  IDLE = 'IDLE',
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  HURT = 'HURT',
  DEAD = 'DEAD',
}


// 实体状态枚举：标识实体的状态
export enum ENTITY_STATE_ENUM {
  IDLE = 'IDLE',
  ATTACK = 'ATTACK',
  MOVE = 'MOVE',
  HURT = 'HURT',
  DEAD = 'DEAD',
}

//实体类型枚举：表示实体的类型
export enum ENTITY_TYPE_ENUM {
  PLAYER = 'PLAYER',
  BLUEHORN = 'BLUEHORN',
  GREENFUZZ = 'GREENFUZZ',
  MUMMY = 'MUMMY',
  OBSIDIANSLICER = 'OBSIDIANSLICER',
  VERDANTCYCLOPS = 'VERDANTCYCLOPS',
}

// 碰撞器类型枚举：标识碰撞器的类型
export enum COLLIDER_TYPE_ENUM {
  PLAYER_BODY = 1,
  PLAYER_ATTACK = 2,
  ENEMY_BODY = 3,
  ENEMY_ATTACK = 4,
  BULLET = 5,
  BULLET_DAMAGE = 6,
}

// 武器类型枚举：标识武器的类型
export enum WEAPON_TYPE_ENUM {
  FLY_SWORD = 'FLY_SWORD',
  BLAST_GUN = 'BLAST_GUN',
  TOXIC_ZONE = 'TOXIC_ZONE',
  ONION_SWORD = 'ONION_SWORD',
  SHOTGUN = 'SHOTGUN',
  THUNDER_FIST = 'THUNDER_FIST',
}




// 场景枚举：标识游戏内的场景
export enum SCENE_ENUM {
  LOADING = 'Loading',
  START = 'Start',
  BATTLE = 'Battle',
}
