using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace SkyAssault.Core.Managers
{
    /// <summary>
    /// Wrapper class for managing inputs using Unity's New Input System, with fallbacks.
    /// </summary>
    public class InputManager : MonoBehaviour
    {
        public static InputManager Instance { get; private set; }

        public Vector2 MoveInput { get; private set; }
        public bool IsFiring { get; private set; }
        public bool UseBombTriggered { get; private set; }
        public bool UseUltimateTriggered { get; private set; }

#if ENABLE_INPUT_SYSTEM
        private PlayerInputActions inputActions;

        private void OnEnable()
        {
            inputActions = new PlayerInputActions();
            inputActions.Player.Enable();
        }

        private void OnDisable()
        {
            inputActions?.Player.Disable();
        }

        private void Update()
        {
            MoveInput = inputActions.Player.Move.ReadValue<Vector2>();
            IsFiring = inputActions.Player.Fire.IsPressed();
            UseBombTriggered = inputActions.Player.Bomb.WasPressedThisFrame();
            UseUltimateTriggered = inputActions.Player.Ultimate.WasPressedThisFrame();
        }
#else
        // Fallback to legacy input system if packages aren't compiled yet
        private void Update()
        {
            float horizontal = Input.GetAxisRaw("Horizontal");
            float vertical = Input.GetAxisRaw("Vertical");
            MoveInput = new Vector2(horizontal, vertical).normalized;

            IsFiring = Input.GetKey(KeyCode.Space) || Input.GetMouseButton(0);
            UseBombTriggered = Input.GetKeyDown(KeyCode.B);
            UseUltimateTriggered = Input.GetKeyDown(KeyCode.F);
        }
#endif

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }
    }
}
