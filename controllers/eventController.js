import Event from "../models/EventSchema.js";
import UserEventMark from "../models/UserEventMarkSchema.js"


// Admin: Create Event
export const CreateEvent = async (req, res) => {
  try {
    const { title, description, date, endDate, location, type, maxAttendees, registrationLink, imageUrl } = req.body;
    
    const newEvent = new Event({
      title,
      description,
      date: new Date(date),
      endDate: new Date(endDate),
      location,
      type,
      maxAttendees,
      registrationLink,
      imageUrl,
      createdBy: req.user.id
    });

    await newEvent.save();
    
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: newEvent
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create event"
    });
  }
};

// Admin: Update Event
export const UpdateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Convert date strings to Date objects if they exist
    if (updates.date) updates.date = new Date(updates.date);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    
    const updatedEvent = await Event.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );
    
    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update event"
    });
  }
};

// Admin: Delete Event
export const DeleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete all user marks for this event
    await UserEventMark.deleteMany({ eventId: id });
    
    const deletedEvent = await Event.findByIdAndDelete(id);
    
    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete event"
    });
  }
};

// Get All Events (for both admin and mentee)
export const GetAllEvents = async (req, res) => {
  try {
    const { status, type, from, to } = req.query;
    let query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    if (from && to) {
      query.date = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }
    
    const events = await Event.find(query)
      .sort({ date: 1 })
      .populate('createdBy', 'fullName profilePic');
    
    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch events"
    });
  }
};

// Get Single Event
export const GetSingleEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findById(id)
      .populate('createdBy', 'fullName profilePic')
      .populate('attendees', 'fullName profilePic');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    res.status(200).json({
      success: true,
      event
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch event"
    });
  }
};

// Mentee: Mark/Register for Event
export const MarkEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    // Check if user already registered
    const existingMark = await UserEventMark.findOne({ 
      userId, 
      eventId 
    });
    
    if (existingMark) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event"
      });
    }
    
    // Check if event has capacity
    if (event.maxAttendees && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: "This event is at full capacity"
      });
    }
    
    // Create the mark
    const newMark = new UserEventMark({
      userId,
      eventId,
      status: 'registered'
    });
    
    await newMark.save();
    
    // Add user to event's attendees
    event.attendees.push(userId);
    await event.save();
    
    res.status(201).json({
      success: true,
      message: "Successfully registered for event",
      mark: newMark
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to register for event"
    });
  }
};

// Mentee: Unmark/Unregister from Event
export const UnmarkEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    // Delete the mark
    const deletedMark = await UserEventMark.findOneAndDelete({ 
      userId, 
      eventId 
    });
    
    if (!deletedMark) {
      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });
    }
    
    // Remove user from event's attendees
    await Event.findByIdAndUpdate(eventId, {
      $pull: { attendees: userId }
    });
    
    res.status(200).json({
      success: true,
      message: "Successfully unregistered from event"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to unregister from event"
    });
  }
};

// Mentee: Get All Marked Events
export const GetMarkedEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const marks = await UserEventMark.find({ userId })
      .populate({
        path: 'eventId',
        populate: {
          path: 'createdBy',
          select: 'fullName profilePic'
        }
      });
    
    res.status(200).json({
      success: true,
      count: marks.length,
      marks
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch marked events"
    });
  }
};

// Admin: Get Event Attendees
export const GetEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const marks = await UserEventMark.find({ eventId })
      .populate('userId', 'fullName email profilePic');
    
    res.status(200).json({
      success: true,
      count: marks.length,
      attendees: marks
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch attendees"
    });
  }
};