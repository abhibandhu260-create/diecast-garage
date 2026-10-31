import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";
import "./style.css";

function App() {
 const [cars, setCars] = useState([]);
 const [categories, setCategories] = useState([]);
 const [manufacturer, setManufacturer] = useState("");

 const [q, setQ] = useState("");
 const [form, setForm] = useState(false);
 const [name, setName] = useState("");
 const [cat, setCat] = useState("");
 const [custom, setCustom] = useState(false);
 const [newCat, setNewCat] = useState("");
 const [open, setOpen] = useState({});

 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");

 // Convert database car data into the structure used by the UI
 const mapCar = (car) => ({
  id: car.id,
  name: car.name,
  manufacturer: car.manufacturer,
  category: car.categories?.name || "Uncategorised",
  categoryId: car.category_id,
  bought: car.is_bought,
 });

 // Fetch categories and cars from Supabase
 const fetchData = async () => {
  setLoading(true);
  setError("");

  const [categoriesResult, carsResult] = await Promise.all([
   supabase.from("categories").select("*"),
   supabase.from("cars").select("*"),
  ]);

  console.log("Categories response:", categoriesResult);
  console.log("Cars response:", carsResult);

  if (categoriesResult.error || carsResult.error) {
   setError(
       categoriesResult.error?.message ||
       carsResult.error?.message
   );
   setLoading(false);
   return;
  }

  setCategories(categoriesResult.data || []);
  setCars(
      (carsResult.data || []).map((car) => ({
       id: car.id,
       name: car.name,
       manufacturer: car.manufacturer,
       categoryId: car.category_id,
       bought: car.isBought,
      }))
  );

  setLoading(false);
 };

 useEffect(() => {
  fetchData();
 }, []);

 const bought = cars.filter((x) => x.bought);
 const pending = cars.filter((x) => !x.bought);

 const match = (x) =>
     (x.name + " " + x.category + " " + (x.manufacturer || ""))
         .toLowerCase()
         .includes(q.toLowerCase());

 // Mark a car as bought or not bought
 const toggle = async (carId) => {
  const car = cars.find((x) => x.id === carId);
  if (!car) return;

  const nextBought = !car.bought;

  const { error } = await supabase
      .from("cars")
      .update({ is_bought: nextBought })
      .eq("id", carId);

  if (error) {
   setError(error.message);
   return;
  }

  setCars((previous) =>
      previous.map((x) =>
          x.id === carId ? { ...x, bought: nextBought } : x
      )
  );
 };

 // Add a new car, optionally creating a category first
 const add = async (e) => {
  e.preventDefault();
  setError("");

  if (!name.trim()) return;

  let categoryId = cat;

  if (custom) {
   if (!newCat.trim()) return;

   const { data: categoryData, error: categoryError } =
       await supabase
           .from("categories")
           .insert({ name: newCat.trim() })
           .select("id, name, desc")
           .single();

   if (categoryError) {
    setError(categoryError.message);
    return;
   }

   categoryId = categoryData.id;

   setCategories((previous) =>
       [...previous, categoryData].sort((a, b) =>
           a.name.localeCompare(b.name)
       )
   );
  }

  if (!categoryId) {
   setError("Please select a category.");
   return;
  }

  const { data, error } = await supabase
      .from("cars")
      .insert({
       name: name.trim(),
       category_id: categoryId,
       is_bought: false,
       manufacturer: manufacturer.trim(),
      })
      .select(`
        id,
        name,
        manufacturer,
        category_id,
        is_bought,
        categories!cars_category_id_fkey (
          id,
          name
        )
      `)
      .single();

  if (error) {
   setError(error.message);
   return;
  }

  setCars((previous) => [...previous, mapCar(data)]);
  setOpen((previous) => ({
   ...previous,
   [data.categories.name]: true,
  }));

  setName("");
  setManufacturer("");
  setNewCat("");
  setCustom(false);
  setForm(false);
 };

 // Delete a car from Supabase
 const remove = async (carId) => {
  if (!confirm("Remove this car?")) return;

  const { error } = await supabase
      .from("cars")
      .delete()
      .eq("id", carId);

  if (error) {
   setError(error.message);
   return;
  }

  setCars((previous) =>
      previous.filter((x) => x.id !== carId)
  );
 };

 const Row = ({ car }) => (
     <div className={"car " + (car.bought ? "owned" : "")}>
      <label>
       <input
           type="checkbox"
           checked={car.bought}
           onChange={() => toggle(car.id)}
       />
       <span className="tick">{car.bought ? "✓" : ""}</span>
       <span>{car.name}</span>
      </label>

      <button
          className="x"
          onClick={() => remove(car.id)}
          aria-label="Remove"
      >
       ×
      </button>
     </div>
 );

 if (loading) {
  return <main><p className="empty">Loading your garage...</p></main>;
 }

 return (
     <main>
      <header>
       <div>
        <small>THE DIECAST GARAGE</small>
        <h1>COLLECTION <em>TRACKER</em></h1>
        <p>Build your dream 1:64 garage, one car at a time.</p>
       </div>
       <div className="scale">
        1:64
        <small>SCALE</small>
       </div>
      </header>

      {error && (
          <p className="empty" style={{ color: "red" }}>
           {error}
          </p>
      )}

      <section className="ownedbox">
       <div className="head">
        <div>
         <small>YOUR COLLECTION</small>
         <h2>🏁 BOUGHT CARS</h2>
        </div>
        <strong>
         {bought.length}
         <small> OWNED</small>
        </strong>
       </div>

       {bought.filter(match).length ? (
           <div className="boughtgrid">
            {bought.filter(match).map((x) => (
                <Row key={x.id} car={x} />
            ))}
           </div>
       ) : (
           <p className="empty">
            {q
                ? "No bought cars match."
                : "Cars you check below will move here and turn green."}
           </p>
       )}

       <div className="progress">
        <div>
         <i
             style={{
              width:
                  (cars.length
                      ? (bought.length / cars.length) * 100
                      : 0) + "%",
             }}
         />
        </div>
        <span>
            {cars.length
                ? Math.round((bought.length / cars.length) * 100)
                : 0}
         % collected · {pending.length} to go
          </span>
       </div>
      </section>

      <section className="tools">
       <div>
        <small>WISHLIST</small>
        <h2>FIND YOUR NEXT CAR</h2>
       </div>

       <div className="actions">
        <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cars or categories…"
        />

        <button
            className="add"
            onClick={() => setForm(!form)}
        >
         {form ? "Close" : "+ Add a car"}
        </button>
       </div>
      </section>

      {form && (
          <form className="form" onSubmit={add}>
           <b>ADD TO YOUR GARAGE</b>

           <label>
            Car name
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nissan Skyline GT-R R34"
                required
            />
           </label>
           <label>
            Manufacturer
            <input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Nissan, Toyota, BMW"
                required
            />
           </label>
           <label>
            Category
            {custom ? (
                <input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="New category"
                    required
                />
            ) : (
                <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    required
                >
                 {categories.map((c) => (
                     <option key={c.id} value={c.id}>
                      {c.name}
                     </option>
                 ))}
                </select>
            )}
           </label>

           <label className="custom">
            <input
                type="checkbox"
                checked={custom}
                onChange={(e) => setCustom(e.target.checked)}
            />
            Create a new category
           </label>

           <button className="save">Add to wishlist</button>
          </form>
      )}

      <section className="groups">
       {categories.map((category) => {
        const list = pending.filter(
            (x) => x.categoryId === category.id && match(x)
        );

        if (!list.length) return null;

        const expanded = open[category.name] !== false;

        return (
            <section className="group" key={category.id}>
             <button
                 className="grouphead"
                 onClick={() =>
                     setOpen((previous) => ({
                      ...previous,
                      [category.name]: !expanded,
                     }))
                 }
             >
              <b>{category.name}</b>
              <span>
                  {list.length} left　{expanded ? "⌃" : "⌄"}
                </span>
             </button>

             {expanded && (
                 <div className="rows">
                  {list.map((x) => (
                      <Row key={x.id} car={x} />
                  ))}
                 </div>
             )}
            </section>
        );
       })}

       {!pending.some(match) && (
           <p className="empty">
            No cars found. Try another search or add one.
           </p>
       )}
      </section>

      <footer>
       <span>Changes are saved to your Supabase database.</span>
       <button onClick={fetchData}>Refresh data</button>
      </footer>
     </main>
 );
}

createRoot(document.getElementById("root")).render(<App />);