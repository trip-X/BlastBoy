local function sortedKeys(t)
    local keys = {}
    for k in pairs(t) do
        keys[#keys + 1] = k
    end
    table.sort(keys, function(a, b)
        return tostring(a) < tostring(b)
    end)
    return keys
end

local function escapeString(s)
    s = s:gsub('\\', '\\\\')
    s = s:gsub("'", "\\'")
    s = s:gsub('\r', '\\r')
    s = s:gsub('\n', '\\n')
    return "'" .. s .. "'"
end

local function isArray(t)
    local n = 0
    for k in pairs(t) do
        if type(k) ~= 'number' then return false end
        if k <= 0 or k % 1 ~= 0 then return false end
        if k > n then n = k end
    end
    for i = 1, n do
        if t[i] == nil then return false end
    end
    return true, n
end

local function serialize(v, indent)
    indent = indent or 0
    local pad = string.rep(' ', indent)
    local pad2 = string.rep(' ', indent + 4)

    local tv = type(v)
    if tv == 'string' then return escapeString(v) end
    if tv == 'number' then return tostring(v) end
    if tv == 'boolean' then return v and 'true' or 'false' end
    if tv ~= 'table' then return 'null' end

    local arr, n = isArray(v)
    if arr then
        if n == 0 then return '[]' end
        local parts = { '[\n' }
        for i = 1, n do
            parts[#parts + 1] = pad2 .. serialize(v[i], indent + 4) .. ',\n'
        end
        parts[#parts + 1] = pad .. ']'
        return table.concat(parts)
    end

    local keys = sortedKeys(v)
    if #keys == 0 then return '{}' end
    local parts = { '{\n' }
    for _, k in ipairs(keys) do
        local key = tostring(k)
        local value = v[k]
        parts[#parts + 1] = pad2 .. key .. ': ' .. serialize(value, indent + 4) .. ',\n'
    end
    parts[#parts + 1] = pad .. '}'
    return table.concat(parts)
end

local weapon = assert(dofile('configs/weapon.lua'))

local outPath = 'assets/Scripts/Tuning/generated/weaponTuning.ts'
local f = assert(io.open(outPath, 'wb'))

f:write("import { WEAPON_TYPE_ENUM } from '../../Enums'\n")
f:write("import type { IWeapon } from '../../Weapon/WeaponTypes'\n\n")
f:write('export const WEAPON_TUNING: Record<WEAPON_TYPE_ENUM, IWeapon> = {\n')

local ORDER = {
    'FLY_SWORD',
    'BLAST_GUN',
    'TOXIC_ZONE',
    'ONION_SWORD',
    'SHOTGUN',
    'THUNDER_FIST',
}

local emitted = {}

for _, key in ipairs(ORDER) do
    local v = weapon[key]
    if v ~= nil then
        emitted[key] = true
        f:write('    [WEAPON_TYPE_ENUM.' .. key .. ']: ')
        f:write(serialize(v, 4))
        f:write(',\n')
    end
end

local rest = {}
for k in pairs(weapon) do
    if not emitted[tostring(k)] then rest[#rest + 1] = k end
end
table.sort(rest, function(a, b) return tostring(a) < tostring(b) end)

for _, k in ipairs(rest) do
    local key = tostring(k)
    local v = weapon[k]
    f:write('    [WEAPON_TYPE_ENUM.' .. key .. ']: ')
    f:write(serialize(v, 4))
    f:write(',\n')
end

f:write('}\n')
f:close()
