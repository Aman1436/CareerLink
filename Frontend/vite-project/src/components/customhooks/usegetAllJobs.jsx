import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAllJobs } from "../../redux/jobSlice";
import axios from "axios";
import { JOB_API_END_POINT } from "../../utils/constant";

export default function usegetAllJobs() {
  const searchedQuery = useSelector((state) => state.job.searchedQuery);
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchAllJobs = async () => {
      try {
        const res = await axios.get(
          `${JOB_API_END_POINT}/get/?keyword=${searchedQuery}`,
          {
            withCredentials: true,
          }
        );
        if (res.data.success) dispatch(setAllJobs(res.data.jobs));
        // console.log(res);
      } catch (error) {
        console.log(error);
      }
    };
    fetchAllJobs();
  }, []);
}
