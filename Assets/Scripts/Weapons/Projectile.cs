using UnityEngine;
using SkyAssault.Core.Managers;

namespace SkyAssault.Weapons
{
    /// <summary>
    /// Base class for all projectiles in the game (both player and enemy).
    /// </summary>
    [RequireComponent(typeof(Collider2D))]
    public class Projectile : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private Vector2 direction = Vector2.up;
        [SerializeField] private float speed = 12f;

        [Header("Damage Settings")]
        [SerializeField] private float damage = 10f;
        [SerializeField] private bool isPlayerOwned = true;

        [Header("Visual Effects")]
        [SerializeField] private string hitEffectPoolTag = "NormalExplosionVFX";

        private Camera mainCamera;

        private void Start()
        {
            mainCamera = Camera.main;
        }

        private void Update()
        {
            transform.Translate(direction * speed * Time.deltaTime, Space.World);
            CheckScreenBounds();
        }

        /// <summary>
        /// Initializes the projectile's velocity and damage attributes.
        /// </summary>
        public void Initialize(Vector2 dir, float velocity, float dmg, bool ownedByPlayer)
        {
            direction = dir.normalized;
            speed = velocity;
            damage = dmg;
            isPlayerOwned = ownedByPlayer;
        }

        private void CheckScreenBounds()
        {
            if (mainCamera == null) return;

            Vector3 viewPos = mainCamera.WorldToViewportPoint(transform.position);
            if (viewPos.y < -0.1f || viewPos.y > 1.1f || viewPos.x < -0.1f || viewPos.x > 1.1f)
            {
                PoolManager.Instance.ReturnToPool(gameObject);
            }
        }

        private void OnTriggerEnter2D(Collider2D collision)
        {
            if (isPlayerOwned)
            {
                if (collision.CompareTag("Enemy") || collision.CompareTag("Boss"))
                {
                    // Apply damage logic to enemy components
                    var enemy = collision.GetComponent<Enemy.EnemyController>();
                    if (enemy != null)
                    {
                        enemy.TakeDamage(damage);
                    }
                    HitTarget();
                }
            }
            else
            {
                if (collision.CompareTag("Player"))
                {
                    // Apply damage logic to player controller
                    var player = collision.GetComponent<Player.PlayerController>();
                    if (player != null)
                    {
                        player.TakeDamage(damage);
                    }
                    HitTarget();
                }
            }
        }

        private void HitTarget()
        {
            if (!string.IsNullOrEmpty(hitEffectPoolTag) && PoolManager.Instance != null)
            {
                PoolManager.Instance.SpawnFromPool(hitEffectPoolTag, transform.position, Quaternion.identity);
            }
            
            if (PoolManager.Instance != null)
            {
                PoolManager.Instance.ReturnToPool(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }
    }
}
