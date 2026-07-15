using UnityEngine;
using SkyAssault.Core.Managers;

namespace SkyAssault.Enemy
{
    /// <summary>
    /// Base class for enemy unit entities.
    /// </summary>
    public class EnemyController : MonoBehaviour
    {
        [Header("Enemy Attributes")]
        [SerializeField] protected float maxHp = 20f;
        [SerializeField] protected int scoreValue = 100;
        [SerializeField] protected int coinReward = 5;
        [Range(0f, 1f)] [SerializeField] private float powerUpDropChance = 0.1f;

        [Header("Visual Effects")]
        [SerializeField] private string explosionVfxTag = "EnemyExplosionNormal";

        protected float currentHp;

        protected virtual void OnEnable()
        {
            currentHp = maxHp;
        }

        /// <summary>
        /// Applies damage to this enemy.
        /// </summary>
        public virtual void TakeDamage(float dmg)
        {
            currentHp -= dmg;
            if (currentHp <= 0f)
            {
                currentHp = 0f;
                Die();
            }
        }

        /// <summary>
        /// Handles death effects, rewards, and object disposal.
        /// </summary>
        protected virtual void Die()
        {
            // Award scores/coins
            if (SaveManager.Instance != null)
            {
                SaveManager.Instance.CurrentData.Coins += coinReward;
            }

            // Spawn explosion particle
            if (PoolManager.Instance != null && !string.IsNullOrEmpty(explosionVfxTag))
            {
                PoolManager.Instance.SpawnFromPool(explosionVfxTag, transform.position, Quaternion.identity);
            }

            // Drop PowerUp randomly
            TryDropPowerUp();

            // Return to Pool instead of destroying
            if (PoolManager.Instance != null)
            {
                PoolManager.Instance.ReturnToPool(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void TryDropPowerUp()
        {
            if (Random.value < powerUpDropChance && PoolManager.Instance != null)
            {
                string[] tags = { "PowerUpWeapon", "PowerUpHealth", "PowerUpShield" };
                string chosenTag = tags[Random.Range(0, tags.Length)];
                PoolManager.Instance.SpawnFromPool(chosenTag, transform.position, Quaternion.identity);
            }
        }
    }
}
