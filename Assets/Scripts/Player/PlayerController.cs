using UnityEngine;
using SkyAssault.Core.Managers;
using SkyAssault.Core.Data;
using SkyAssault.Weapons;

namespace SkyAssault.Player
{
    /// <summary>
    /// Coordinates player inputs, health state, visual upgrades, and firing states.
    /// </summary>
    public class PlayerController : MonoBehaviour
    {
        [Header("Aircraft Profile")]
        [SerializeField] private AircraftData aircraftProfile;

        [Header("Visual Effects")]
        [SerializeField] private GameObject engineThrusterEffect;
        [SerializeField] private GameObject shieldVisualEffect;
        [SerializeField] private string deathVfxPoolTag = "PlayerExplosionLarge";

        private float currentHp;
        private float currentShield;
        private float speed;
        private float armor;

        private Weapon primaryWeapon;
        private Camera mainCamera;

        public float HealthPercentage => currentHp / aircraftProfile.baseHp;
        public float ShieldPercentage => currentShield / 100f;

        private void Start()
        {
            mainCamera = Camera.main;
            InitializeStats();
        }

        private void InitializeStats()
        {
            currentHp = aircraftProfile.baseHp;
            currentShield = 0f;
            speed = aircraftProfile.baseSpeed;
            armor = aircraftProfile.baseArmor;

            primaryWeapon = GetComponentInChildren<Weapon>();
            if (primaryWeapon != null && SaveManager.Instance != null)
            {
                // Set saved upgrade level
                int index = SaveManager.Instance.CurrentData.UpgradesKeys.IndexOf(aircraftProfile.id);
                int lvl = index != -1 ? SaveManager.Instance.CurrentData.UpgradesValues[index] : 1;
                primaryWeapon.SetUpgradeLevel(lvl);
            }
        }

        private void Update()
        {
            HandleMovement();
            HandleFiring();
            HandleShieldDecay();
        }

        private void HandleMovement()
        {
            if (InputManager.Instance == null) return;

            Vector2 moveDir = InputManager.Instance.MoveInput;
            Vector3 movement = new Vector3(moveDir.x, moveDir.y, 0f) * speed * Time.deltaTime;
            transform.Translate(movement, Space.World);

            // Restrict player inside screen bounds
            if (mainCamera != null)
            {
                Vector3 viewPos = mainCamera.WorldToViewportPoint(transform.position);
                viewPos.x = Mathf.Clamp(viewPos.x, 0.05f, 0.95f);
                viewPos.y = Mathf.Clamp(viewPos.y, 0.05f, 0.95f);
                transform.position = mainCamera.ViewportToWorldPoint(viewPos);
            }
        }

        private void HandleFiring()
        {
            if (InputManager.Instance != null && InputManager.Instance.IsFiring && primaryWeapon != null)
            {
                primaryWeapon.TryFire();
            }
        }

        private void HandleShieldDecay()
        {
            if (currentShield > 0f)
            {
                currentShield -= Time.deltaTime * 5f; // Decreases shield slowly
                if (currentShield <= 0f)
                {
                    currentShield = 0f;
                    if (shieldVisualEffect != null) shieldVisualEffect.SetActive(false);
                }
            }
        }

        /// <summary>
        /// Restores player health.
        /// </summary>
        public void Heal(float amount)
        {
            currentHp = Mathf.Min(aircraftProfile.baseHp, currentHp + amount);
        }

        /// <summary>
        /// Activates player energy shield.
        /// </summary>
        public void ActivateShield(float capacity)
        {
            currentShield = capacity;
            if (shieldVisualEffect != null) shieldVisualEffect.SetActive(true);
        }

        /// <summary>
        /// Processes damage dealt to the player.
        /// </summary>
        public void TakeDamage(float rawDamage)
        {
            float finalDamage = Mathf.Max(1f, rawDamage - armor);

            if (currentShield > 0f)
            {
                currentShield -= finalDamage;
                if (currentShield < 0f)
                {
                    currentHp += currentShield; // Deducts leftover from health
                    currentShield = 0f;
                    if (shieldVisualEffect != null) shieldVisualEffect.SetActive(false);
                }
            }
            else
            {
                currentHp -= finalDamage;
            }

            if (currentHp <= 0f)
            {
                currentHp = 0f;
                Die();
            }
        }

        private void Die()
        {
            if (PoolManager.Instance != null && !string.IsNullOrEmpty(deathVfxPoolTag))
            {
                PoolManager.Instance.SpawnFromPool(deathVfxPoolTag, transform.position, Quaternion.identity);
            }

            // Notify GameManager
            if (GameManager.Instance != null)
            {
                GameManager.Instance.UpdateState(GameState.GameOver);
            }

            gameObject.SetActive(false);
        }
    }
}
