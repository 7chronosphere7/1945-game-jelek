using UnityEngine;

namespace SkyAssault.Core.Data
{
    /// <summary>
    /// Configuration data representing upgradable weapons.
    /// </summary>
    [CreateAssetMenu(fileName = "NewWeaponData", menuName = "Sky Assault/Data/Weapon")]
    public class WeaponData : ScriptableObject
    {
        public string id;
        public string weaponName;

        [Header("Base Stats")]
        public float baseDamage = 10f;
        public float baseFireRate = 0.2f;
        public float baseProjectileSpeed = 10f;

        [Header("Pooling Tags")]
        public string projectilePoolTag = "PlayerBulletNormal";

        [Header("Upgrade Scaling")]
        public float damageIncreasePerLevel = 2f;
        public float fireRateMultiplierPerLevel = 0.95f; // Reduces fire interval

        /// <summary>
        /// Gets the damage at a specific upgrade level.
        /// </summary>
        public float GetDamage(int level)
        {
            return baseDamage + (damageIncreasePerLevel * (level - 1));
        }

        /// <summary>
        /// Gets the fire rate interval at a specific upgrade level.
        /// </summary>
        public float GetFireRate(int level)
        {
            return baseFireRate * Mathf.Pow(fireRateMultiplierPerLevel, level - 1);
        }
    }
}
