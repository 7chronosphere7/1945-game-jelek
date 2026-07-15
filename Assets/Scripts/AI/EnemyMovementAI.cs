using UnityEngine;

namespace SkyAssault.AI
{
    public enum AIMovementPattern
    {
        Straight,
        Zigzag,
        Circle,
        Kamikaze
    }

    /// <summary>
    /// Handles custom movement routes for enemy ships.
    /// </summary>
    public class EnemyMovementAI : MonoBehaviour
    {
        [Header("Movement Configuration")]
        [SerializeField] private AIMovementPattern pattern = AIMovementPattern.Straight;
        [SerializeField] private float speed = 3f;

        [Header("Zigzag Settings")]
        [SerializeField] private float frequency = 2f;
        [SerializeField] private float amplitude = 3f;

        [Header("Circle Settings")]
        [SerializeField] private float radius = 2f;

        private float cycleTimer;
        private Vector3 startPosition;
        private Transform playerTransform;

        private void OnEnable()
        {
            startPosition = transform.position;
            cycleTimer = 0f;

            GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
            if (playerObj != null)
            {
                playerTransform = playerObj.transform;
            }
        }

        private void Update()
        {
            cycleTimer += Time.deltaTime;

            switch (pattern)
            {
                case AIMovementPattern.Straight:
                    transform.Translate(Vector3.down * speed * Time.deltaTime, Space.World);
                    break;

                case AIMovementPattern.Zigzag:
                    float xOffset = Mathf.Sin(cycleTimer * frequency) * amplitude;
                    Vector3 zigzagPos = transform.position;
                    zigzagPos.y -= speed * Time.deltaTime;
                    zigzagPos.x = startPosition.x + xOffset;
                    transform.position = zigzagPos;
                    break;

                case AIMovementPattern.Circle:
                    float radX = Mathf.Cos(cycleTimer * speed) * radius;
                    float radY = Mathf.Sin(cycleTimer * speed) * radius;
                    // Moves downward overall while looping
                    startPosition.y -= speed * Time.deltaTime * 0.5f;
                    transform.position = new Vector3(startPosition.x + radX, startPosition.y + radY, 0f);
                    break;

                case AIMovementPattern.Kamikaze:
                    if (playerTransform != null)
                    {
                        Vector3 direction = (playerTransform.position - transform.position).normalized;
                        transform.Translate(direction * speed * Time.deltaTime, Space.World);
                    }
                    else
                    {
                        transform.Translate(Vector3.down * speed * Time.deltaTime, Space.World);
                    }
                    break;
            }
        }
    }
}
