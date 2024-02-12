import React from "react";

import Card from "../../shared/components/UIElements/Card";
import "./PlacesList.css";
import PlacesItem from "./PlacesItem";
import Button from '../../shared/components/FormComponents/Button';

const PlacesList = (props) => {
  if (props.items.length === 0) {
    return (
      <div className="center place-list">
        <Card>
          <h2>No Place Found</h2>
          <Button to='/places/new'>Share Place</Button>
        </Card>
      </div>
    );
  }
  return (
    <ul className="place-list">
      {props.items.map((place) => (
        <PlacesItem
          key={place.id}
          id={place.id}
          image={place.url}
          title={place.title}
          desc={place.desc}
          address={place.address}
          creatorID={place.creatorID}
          coordinates={place.location}
          onDelete={props.onDeletePlace}
        />
      ))}
    </ul>
  );
};

export default PlacesList;
