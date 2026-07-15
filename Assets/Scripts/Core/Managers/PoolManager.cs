using System.Collections.Generic;
using UnityEngine;

namespace SkyAssault.Core.Managers
{
    /// <summary>
    /// Highly optimized, dictionary-based Object Pooling system to minimize Garbage Collection overhead.
    /// </summary>
    public class PoolManager : MonoBehaviour
    {
        public static PoolManager Instance { get; private set; }

        [System.Serializable]
        public class Pool
        {
            public string tag;
            public GameObject prefab;
            public int size;
        }

        [SerializeField] private List<Pool> pools;
        private Dictionary<string, Queue<GameObject>> poolDictionary;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializePools();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializePools()
        {
            poolDictionary = new Dictionary<string, Queue<GameObject>>();

            foreach (var pool in pools)
            {
                Queue<GameObject> objectPool = new Queue<GameObject>();

                for (int i = 0; i < pool.size; i++)
                {
                    GameObject obj = Instantiate(pool.prefab, transform);
                    obj.SetActive(false);
                    objectPool.Enqueue(obj);
                }

                poolDictionary.Add(pool.tag, objectPool);
            }
        }

        /// <summary>
        /// Spawns a pooled object with designated transform settings.
        /// </summary>
        /// <param name="tag">Unique pool key tag.</param>
        /// <param name="position">Target spawning position.</param>
        /// <param name="rotation">Target spawning rotation.</param>
        /// <returns>The activated GameObject, or null if the tag doesn't exist.</returns>
        public GameObject SpawnFromPool(string tag, Vector3 position, Quaternion rotation)
        {
            if (!poolDictionary.ContainsKey(tag))
            {
                Debug.LogWarning($"Pool with tag {tag} doesn't exist.");
                return null;
            }

            GameObject objectToSpawn = poolDictionary[tag].Dequeue();

            // Re-enqueue the object back to the end of the pool queue
            poolDictionary[tag].Enqueue(objectToSpawn);

            objectToSpawn.transform.position = position;
            objectToSpawn.transform.rotation = rotation;
            objectToSpawn.SetActive(false); // Reset status
            objectToSpawn.SetActive(true);

            return objectToSpawn;
        }

        /// <summary>
        /// Deactivates a pooled object, effectively returning it to the pool.
        /// </summary>
        /// <param name="obj">The game object to return.</param>
        public void ReturnToPool(GameObject obj)
        {
            obj.SetActive(false);
        }
    }
}
