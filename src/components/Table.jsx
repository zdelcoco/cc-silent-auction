import React, { useContext } from "react";
import { Row, ItemCard } from "./Row";
import { ItemsContext } from "../contexts/ItemsContext";

const Table = () => {
  const { items } = useContext(ItemsContext);

  return (
    <>
      <div className="table-responsive d-none d-md-block">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Price</th>
              <th>Bids</th>
              <th>Winner / Contact</th>
              <th>Time Left</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-md-none">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
};

export default Table;
