using UnityEngine;
using SkyAssault.Core.Managers;
using SkyAssault.Weapons;

namespace SkyAssault.Enemy
{
    /// <summary>
    /// Coordinates Boss-specific behaviors, state phases, and stage completion rewards.
    /// </summary>
    public class BossController : EnemyController
    {
        [Header("Boss Config")]
        [SerializeField] private string bossName = "Goliath Overlord";
        [SerializeField] private float phase2Threshold = 0.5f;

        [Header("Weapon Systems")]
        [SerializeField] private Weapon phase1Weapon;
        [SerializeField] private Weapon phase2Weapon;
        [SerializeField] private float attackInterval = 1.5f;

        private int currentPhase = 1;
        private float attackTimer;

        protected override void OnEnable()
        {
            base.OnEnable();
            currentPhase = 1;
            attackTimer = attackInterval;
        }

        private void Update()
        {
            HandlePhases();
            HandleAttacking();
        }

        private void HandlePhases()
        {
            float hpRatio = currentHp / maxHp;

            if (currentPhase == 1 && hpRatio <= phase2Threshold)
            {
                currentPhase = 2;
                TriggerPhase2Transition();
            }
        }

        private void TriggerPhase2Transition()
        {
            Debug.Log($"{bossName} entered Phase 2! Attack speed increased.");
            attackInterval *= 0.7f; // Fires faster in Phase 2
        }

        private void HandleAttacking()
        {
            attackTimer -= Time.deltaTime;
            if (attackTimer <= 0f)
            {
                if (currentPhase == 1 && phase1Weapon != null)
                {
                    phase1Weapon.TryFire();
                }
                else if (currentPhase == 2 && phase2Weapon != null)
                {
                    phase2Weapon.TryFire();
                }

                attackTimer = attackInterval;
            }
        }

        protected override void Die()
        {
            Debug.Log($"{bossName} has been defeated!");

            // Notify GameManager of level victory
            if (GameManager.Instance != null)
            {
                GameManager.Instance.UpdateState(GameState.Victory);
            }

            base.Die();
        }
    }
}
