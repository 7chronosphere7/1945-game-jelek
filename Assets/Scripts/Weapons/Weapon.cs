using UnityEngine;
using SkyAssault.Core.Managers;
using SkyAssault.Core.Data;

namespace SkyAssault.Weapons
{
    /// <summary>
    /// Attaches to aircraft, controls firing intervals, upgrades, and spread patterns.
    /// </summary>
    public class Weapon : MonoBehaviour
    {
        [SerializeField] private WeaponData weaponConfig;
        [SerializeField] private Transform[] muzzlePoints;
        [SerializeField] private bool isPlayerOwned = true;

        private float fireTimer;
        private int currentUpgradeLevel = 1;

        /// <summary>
        /// Sets the current weapon level for upgrades.
        /// </summary>
        public void SetUpgradeLevel(int level)
        {
            currentUpgradeLevel = Mathf.Max(1, level);
        }

        private void Update()
        {
            if (fireTimer > 0f)
            {
                fireTimer -= Time.deltaTime;
            }
        }

        /// <summary>
        /// Fires weapon projectiles if the cooldown timer has elapsed.
        /// </summary>
        public void TryFire()
        {
            if (fireTimer > 0f) return;

            float fireRate = weaponConfig.GetFireRate(currentUpgradeLevel);
            float damage = weaponConfig.GetDamage(currentUpgradeLevel);
            float speed = weaponConfig.baseProjectileSpeed;
            string poolTag = weaponConfig.projectilePoolTag;

            if (muzzlePoints == null || muzzlePoints.Length == 0) return;

            foreach (var muzzle in muzzlePoints)
            {
                FireProjectile(muzzle.position, Vector2.up, speed, damage, poolTag);
            }

            fireTimer = fireRate;
        }

        private void FireProjectile(Vector2 pos, Vector2 dir, float spd, float dmg, string tag)
        {
            if (PoolManager.Instance == null) return;

            GameObject bulletObj = PoolManager.Instance.SpawnFromPool(tag, pos, Quaternion.identity);
            if (bulletObj != null)
            {
                Projectile proj = bulletObj.GetComponent<Projectile>();
                if (proj != null)
                {
                    proj.Initialize(dir, spd, dmg, isPlayerOwned);
                }
            }
        }
    }
}
