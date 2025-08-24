/**
 * A generic repository class for managing data storage in localStorage.
 * @template T - The type of data to be stored.
 */
class Repository<T> {
  private storageKey: string;

  protected data: T ;

  /**
   * Creates an instance of Repository.
   * @param {string} storageKey - The key used to store data in localStorage.
   */
  constructor(storageKey: string, defaultData: T) {
    this.storageKey = storageKey;

    this.data = defaultData;
    this.load();
  }

  /**
   * Saves the current data to localStorage.
   * @returns {void}
   */
  save(): void {
    console.log('saving data');
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  /**
   * Loads the data from localStorage.
   * @returns {void}
   */
  load(): void {
    console.log('loading data');

    const data = localStorage.getItem(this.storageKey);
    if (data) {
      this.data = JSON.parse(data);
      return;
    }
  }

  /**
   * Clears the data from localStorage.
   * @returns {void}
   */
  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export default Repository;
