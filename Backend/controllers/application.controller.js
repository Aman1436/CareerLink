import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import axios from "axios";

//for applying to a job
export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;
    if (!jobId) {
      return res.status(400).json({
        message: "Job id is required",
        success: false,
      });
    }

    //checking if the user has already applied for the job and thus cannot apply multiple times
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: userId,
    });
    if (existingApplication) {
      return res.status(404).json({
        message: "You have already applied for this job.",
        success: false,
      });
    }
    //checking if the job even exists(halaki hame frontend wo jobs dikhenge hi nhi but fir bhi ham sb kuch handle kar ke chal rhe)
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: "Job with this id does not exists",
        success: false,
      });
    }

    //creating a new application
    const data=await axios.get(`http://127.0.0.1:5000/analyze_resume/${userId}`);
    console.log(data.data.skills.found);
    const skills = [...data.data.skills.found.soft_skills, ...data.data.skills.found.technical_skills];
    const newApplication = await Application.create({
      job: jobId,
      applicant: userId,
      skills: skills,
    });

    //hamne since job wali schema me ek applications ke ids ki array bhi rakhi as a field to use bhi update krna padega
    console.log("new application", newApplication);
    job.applications.push(newApplication._id);
    await job.save();
    console.log("jobs ", job);
    return res.status(201).json({
      message: "Job applied successfully",

      success: true,
    });
  } catch (error) {
    console.log("kuch to garbad hai daya");
  }
};

//to get all the jobs to which you have applied
export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.id;
    console.log("checking");
    const appliedJobs = await Application.find({ applicant: userId })
      .sort({ createdAt: -1 }) // Close sort function
      .populate({
        path: "job",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "company",
          options: { sort: { createdAt: -1 } },
        },
      });

    //sorted in the ascending order of time of applying the jobs
    if (!appliedJobs) {
      return res.status(201).json({
        message: "You have not applied to any jobs yet.",
        success: true,
        appliedJobs: [],
      });
    }
    return res.status(201).json({
      message: "You have applied to following jobs",
      appliedJobs,
      success: true,
    });
  } catch (error){
    console.log("kuch to gadbad hai daya");
  }
};
//to find all the users who have applied for a particular job(whose job id he will provide in the url(route)) posted by him as a recruiter
export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;
    if (!jobId) {
      return res.status(401).json({
        message: "pls provide the job id",
        success: false,
      });
    }

    const job = await Job.findById(jobId).populate({
      path: "applications",
      populate: {
        path: "applicant",
      },
    });

    if (!job) {
      return res.status(401).json({
        message: "no jobs with the provided job id has been posted",
        success: false,
      });
    }

    const requiredSkills = job.requirements || [];
    //console.log(requiredSkills);
    const applications = job.applications
  .map((application) => {
    const applicantSkills = application.skills || [];
    const matchedSkills = applicantSkills.filter(skill =>
      requiredSkills.includes(skill)
    );
    return {
      ...application._doc,
      matchedSkills,
      matchedSkillCount: matchedSkills.length,
      createdAt: application.createdAt,
    };
  })
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // .sort((a, b) => b.matchedSkillCount - a.matchedSkillCount);
      //console.log(applications);
      const sortedApplications = [...applications];
      sortedApplications.sort((a, b) => b.matchedSkillCount - a.matchedSkillCount);
    return res.status(200).json({
      applications: [applications, sortedApplications],
      success: true,
    });

  } catch (error){
    console.log("kuch to gadbad hai daya", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//updating the status of the application by the recruiter that whether the application has been accepted or rejected
//ye dhyan ham frontend me rakhenge ki recruiter apni hi post ki hui job postings ko accept ya reject kar paye
export const updateStatus = async (req, res) => {
  try {
    console.log(req.body);
    const { status } = req.body;
    const applicationId = req.params.id;
    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        success: false,
      });
    }
    const application = await Application.findOne({ _id: applicationId });
    if (!application){
      return res.status(400).json({
        message: "Application not found",
        success: false,
      });
    }

    //updating the status
    application.status = status.toLowerCase();
    await application.save();

    return res.status(200).json({
      message: "Status updated successfully",
      success: true,
    });
  } catch (error) {
    console.log("kuch to garbad hai daya");
  }
};
